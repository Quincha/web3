import crypto from 'node:crypto';
import zlib from 'node:zlib';

// --------------------------------------------------------------------------
// Conversión de archivos de bordado (JEF / DST / PES) a:
//   - meta: metadatos (dimensiones, puntadas, colores, formato)
//   - preview: PNG en base64 renderizado de las puntadas
//
// Implementación sin dependencias externas: parseamos los contenedores de
// coordenadas de puntadas (3 formatos comunes de máquinas de bordar) y
// dibujamos sobre un canvas de píxeles propio que luego codificamos a PNG.
// --------------------------------------------------------------------------

// --- PNG encoder mínimo (RGB, sin alpha, filtro 0 por fila) -----------------
// Sirve para devolver la vista previa sin depender de librerías de imagen.
function pngEncode(width, height, rgba) {
  const rows = [];
  const rowBytes = width * 3;
  for (let y = 0; y < height; y++) {
    const out = Buffer.alloc(1 + rowBytes);
    out[0] = 0; // filtro None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      out[1 + x * 3 + 0] = rgba[i + 0];
      out[1 + x * 3 + 1] = rgba[i + 1];
      out[1 + x * 3 + 2] = rgba[i + 2];
    }
    rows.push(out);
  }
  const raw = Buffer.concat(rows);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type: RGB
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// CRC-32 (polinomio estándar del PNG)
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// --- Parseadores de formatos -----------------------------------------------
// Implementación fiel a pyembroidery (la referencia de facto): cada parser
// traduce el contenedor binario a una lista de puntos absolutos {x, y, jump}.
// Todos los bucles llevan bounds-check para nunca leer fuera del buffer.

// Signed helpers del formato (ver pyembroidery ReadHelper / PecReader).
const signed8 = (b) => (b & 0x80 ? b - 0x100 : b);
const signed7 = (b) => (b > 63 ? b - 128 : b);
const signed12 = (b) => {
  b &= 0xfff;
  return b > 0x7ff ? b - 0x1000 : b;
};
const readInt24LE = (buf, off) => buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16);

export function parseJEF(buf) {
  // Header (pyembroidery): u32 stitch_offset, seek(20), u32 count_colors,
  // seek(88), luego count_colors u32 con índice de color.
  if (buf.length < 28) throw new Error('JEF demasiado corto');
  const stitchOffset = buf.readUInt32LE(0);
  const colorCount = buf.readUInt32LE(24);

  const colors = [];
  for (let i = 0; i < colorCount && i < 128; i++) {
    const off = 116 + i * 4;
    if (off + 4 > buf.length) break;
    const idx = Math.abs(buf.readInt32LE(off));
    colors.push(encodeColor(hexToRgb(JEF_PALETTE[idx % JEF_PALETTE.length])));
  }

  // Stitches: pares de bytes signed8; si b0 === 0x80 es un comando (4 bytes).
  const stitches = [];
  let i = stitchOffset;
  let px = 0;
  let py = 0;
  let color = 0;
  let guard = 0;
  while (i + 1 < buf.length && guard++ < 10000000) {
    const b0 = buf[i];
    const b1 = buf[i + 1];
    if (b0 !== 0x80) {
      px += signed8(b0);
      py -= signed8(b1); // JEF: +Y es hacia abajo; pyembroidery niega el Y
      stitches.push({ x: px, y: py, jump: false, color });
      i += 2;
      continue;
    }
    const ctrl = b1;
    i += 2;
    if (ctrl === 0x10) break; // END
    if (i + 1 >= buf.length) break;
    const x = signed8(buf[i]);
    const y = -signed8(buf[i + 1]);
    i += 2;
    if (ctrl === 0x02) {
      px += x;
      py += y;
      stitches.push({ x: px, y: py, jump: true, color });
    } else if (ctrl === 0x01) {
      px += x;
      py += y;
      color = Math.min(color + 1, Math.max(colors.length - 1, 0));
    } else {
      break; // comando sin capturar
    }
  }

  return { stitches, colors, colorCount: colors.length };
}

function getbit(b, pos) {
  return (b >> pos) & 1;
}

// Decodificación de desplazamientos DST (bits ponderados, ver DstReader.py).
function decodeDX(b0, b1, b2) {
  return getbit(b2, 2) * 81 - getbit(b2, 3) * 81
    + getbit(b1, 2) * 27 - getbit(b1, 3) * 27
    + getbit(b0, 2) * 9 - getbit(b0, 3) * 9
    + getbit(b1, 0) * 3 - getbit(b1, 1) * 3
    + getbit(b0, 0) * 1 - getbit(b0, 1) * 1;
}

function decodeDY(b0, b1, b2) {
  const y = getbit(b2, 5) * 81 - getbit(b2, 4) * 81
    + getbit(b1, 5) * 27 - getbit(b1, 4) * 27
    + getbit(b0, 5) * 9 - getbit(b0, 4) * 9
    + getbit(b1, 7) * 3 - getbit(b1, 6) * 3
    + getbit(b0, 7) * 1 - getbit(b0, 6) * 1;
  return -y; // misma convención que pyembroidery
}

export function parseDST(buf) {
  if (buf.length < 512) throw new Error('DST demasiado corto');
  const header = buf.slice(0, 512).toString('latin1');

  // Colores: líneas TC: <hex>, <nombre>, <catálogo> en el encabezado.
  const colors = [];
  for (const rawLine of header.split(/[\r\n]+/)) {
    const line = rawLine.trim();
    const m = /^TC\s*[:;]?\s*#?([0-9a-fA-F]{6})/i.exec(line);
    if (m) colors.push(encodeColor(hexToRgb(m[1])));
  }

  const stitches = [];
  let i = 512;
  let px = 0;
  let py = 0;
  let color = 0;
  let guard = 0;
  while (i + 2 < buf.length && guard++ < 10000000) {
    const b0 = buf[i];
    const b1 = buf[i + 1];
    const b2 = buf[i + 2];
    i += 3;

    // Fin: bits bajos (0b11110011) en el tercer byte.
    if ((b2 & 0xf3) === 0xf3) break;

    const dx = decodeDX(b0, b1, b2);
    const dy = decodeDY(b0, b1, b2);
    px += dx;
    py += dy;

    if ((b2 & 0xc3) === 0xc3) {
      // Cambio de color (no cuenta como punto).
      color = Math.min(color + 1, Math.max(colors.length - 1, 0));
    } else if ((b2 & 0x83) === 0x83) {
      // Salto (move) sin puntada.
      stitches.push({ x: px, y: py, jump: true, color });
    } else if ((b2 & 0x43) === 0x43) {
      // Modo lentejuela: se ignora para la vista previa.
      continue;
    } else {
      stitches.push({ x: px, y: py, jump: false, color });
    }
  }

  return { stitches, colors, colorCount: colors.length };
}

// PES (Brother): el encabezado declara la posición del bloque PEC que guarda
// las puntadas reales (ver PesReader/PecReader de pyembroidery).
export function parsePES(buf) {
  if (buf.length < 16) throw new Error('PES demasiado corto');
  const sig = buf.slice(0, 8).toString('latin1');

  let pecPos;
  if (sig === '#PEC0001') {
    pecPos = 0; // archivo PEC standalone embebido en el PES
  } else if (sig.startsWith('#PES')) {
    pecPos = buf.readUInt32LE(8);
  } else {
    throw new Error('PES inválido: firma no reconocida');
  }
  if (!(pecPos >= 0 && pecPos < buf.length)) throw new Error('PES inválido: posición PEC fuera de rango');

  const p = pecPos;

  // read_pec: skip "LA:", label(16), pad 0xF, stride/height, pad 0xC, cc.
  let o = p + 3 + 16 + 0xf + 2 + 0xc;
  if (o >= buf.length) throw new Error('PES inválido: encabezado PEC corto');
  const colorChanges = buf[o];
  o += 1;

  const colors = [];
  if (colorChanges !== 0xff) {
    const countColors = colorChanges + 1;
    for (let k = 0; k < countColors; k++) {
      if (o + k >= buf.length) break;
      colors.push(encodeColor(hexToRgb(PEC_PALETTE[buf[o + k] % PEC_PALETTE.length])));
    }
    o += countColors;
  }

  // o += 0x1D0 - colorChanges; stitch_block_end = int24 - 5 + tell.
  o += 0x1d0 - colorChanges;
  if (o + 3 > buf.length) throw new Error('PES inválido: bloque PEC corto');
  const stitchBlockEnd = readInt24LE(buf, o) - 5 + (o + 3);
  o += 3 + 0x0b;

  // read_pec_stitches: pares de bytes signed7/signed12 con flags de salto.
  const stitches = [];
  let px = 0;
  let py = 0;
  let color = 0;
  let guard = 0;
  while (o + 1 < buf.length && guard++ < 10000000) {
    let val1 = buf[o];
    let val2 = buf[o + 1];
    o += 2;
    if ((val1 === 0xff && val2 === 0x00)) break; // fin de puntadas
    if (val1 === 0xfe && val2 === 0xb0) {
      o += 1; // cambio de color con un byte extra
      color = Math.min(color + 1, Math.max(colors.length - 1, 0));
      continue;
    }

    let jump = false;
    let trim = false;
    let x;
    if (val1 & 0x80) {
      if (val1 & 0x20) trim = true;
      if (val1 & 0x10) jump = true;
      x = signed12((val1 << 8) | val2);
      val2 = buf[o];
      o += 1;
      if (val2 === undefined) break;
    } else {
      x = signed7(val1);
    }

    let y;
    if (val2 & 0x80) {
      if (val2 & 0x20) trim = true;
      if (val2 & 0x10) jump = true;
      const val3 = buf[o];
      o += 1;
      if (val3 === undefined) break;
      y = signed12((val2 << 8) | val3);
    } else {
      y = signed7(val2);
    }

    px += x;
    py += y;
    // pyembroidery: jump o trim+move emiten un punto de salto (no se dibuja).
    stitches.push({ x: px, y: py, jump: jump || trim, color });
  }

  void stitchBlockEnd; // las puntadas se leen hasta el marcador 0xFF 0x00

  return { stitches, colors, colorCount: colors.length };
}

// --- Paletas de color por máquina (de pyembroidery) ------------------------

// Paleta Janome JEF (79 colores) — índice % length, como en JefReader.py.
const JEF_PALETTE = [
  '#000000', '#000000', '#FFFFFF', '#FFFF17', '#FF6600', '#2F5933', '#237336',
  '#65C2C8', '#AB5A96', '#F669A0', '#FF0000', '#B1704E', '#0B2F84', '#E4C35D',
  '#481A05', '#AC9CC7', '#FCF294', '#F999B7', '#FAB381', '#C9A480', '#970533',
  '#A0B8CC', '#7FC21C', '#E5E5E5', '#889B9B', '#98D6BD', '#B2E1E3', '#368BA0',
  '#4F83AB', '#386A91', '#071650', '#F999A2', '#F9676B', '#E3311F', '#E2A188',
  '#B59474', '#E4CF99', '#FFCB00', '#E1ADD4', '#C3007E', '#80004B', '#540571',
  '#B10525', '#CAE0C0', '#899856', '#5C941A', '#003114', '#5DAE94', '#4CBF8F',
  '#007772', '#595B61', '#FFFFF2', '#B15818', '#CB8A07', '#986C80', '#98692D',
  '#4D3419', '#4C330B', '#33200A', '#523A97', '#0D217E', '#1E77AC', '#B2DD53',
  '#F33689', '#DE649E', '#984161', '#4C5612', '#4C881F', '#E4DE79', '#CB8A1A',
  '#CBA21C', '#FF9805', '#FCB257', '#FFE505', '#F0331F', '#1A842D', '#386CAE',
  '#E3C4B4', '#E3AC81',
];

// Paleta PEC de Brother (65 colores) — índice % length, como en PecReader.py.
const PEC_PALETTE = [
  '#000000', '#0E1F7C', '#0A55A3', '#008777', '#4B6BAF', '#ED171F', '#D15C00',
  '#913697', '#E49ACB', '#915FAC', '#9ED67D', '#E8A900', '#FEBA35', '#FFFF00',
  '#70BC1F', '#BA9800', '#A8A8A8', '#7D6F00', '#FFFFB3', '#4F5556', '#000000',
  '#0B3D91', '#770176', '#293133', '#2A1301', '#F64A8A', '#B27624', '#FCBBC5',
  '#FE370F', '#F0F0F0', '#6A1C8A', '#A8DDC4', '#2584BB', '#FEB343', '#FFF36B',
  '#D0A660', '#D15400', '#66BA49', '#134A46', '#878787', '#D8CCC6', '#435607',
  '#FDD9DE', '#F993BC', '#003822', '#B2AFD4', '#686AB0', '#EFE3B9', '#F73866',
  '#B54B64', '#132B1A', '#C70156', '#FE9E32', '#A8DEEB', '#00673E', '#4E2990',
  '#2F7E20', '#FFCCCC', '#FFD911', '#095BA6', '#F0F970', '#E3F35B', '#FF9900',
  '#FFF08D', '#FFC8C8',
];

function hexToRgb(hex) {
  const n = parseInt(hex.replace(/^#/, ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function encodeColor([r, g, b]) {
  return { r, g, b, hex: `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}` };
}

// --- Renderizado ------------------------------------------------------------

// Convierte la lista de puntadas a coordenadas de imagen y genera un PNG.
// Usa min/max para encuadrar el dibujo con margen automático.
//   mode = 'puntos'   → esquema fino gris de las puntadas (trazado).
//   mode = 'bordado'  → acabado tipo TrueView: hilos finos e individuales,
//                       iluminación difusa suave, sombra tenue y fondo de
//                       tela texturizado. Se renderiza con supersampling 2×
//                       y se reduce a la salida (antialiasing, bordes finos).
//   colors = paleta del formato [{ r, g, b, hex }]; cada puntada lleva el
//   índice `color` de su bloque.
function render(stitches, size = 512, colors = [], mode = 'puntos') {
  if (!stitches || stitches.length === 0) {
    // PNG en blanco (transparente) en lugar de una imagen rota.
    const rgba = Buffer.alloc(size * size * 4, 0);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        rgba[(y * size + x) * 4 + 0] = 255;
        rgba[(y * size + x) * 4 + 1] = 255;
        rgba[(y * size + x) * 4 + 2] = 255;
        rgba[(y * size + x) * 4 + 3] = 255;
      }
    }
    return { png: pngEncode(size, size, rgba), width: size, height: size };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of stitches) {
    if (s.x < minX) minX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.x > maxX) maxX = s.x;
    if (s.y > maxY) maxY = s.y;
  }
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const margin = 32;
  const w = size;
  const h = size;
  const scale = Math.min((w - margin * 2) / (spanX || 1), (h - margin * 2) / (spanY || 1), 8);
  const ox = (w - spanX * scale) / 2 - minX * scale;
  const oy = (h - spanY * scale) / 2 - minY * scale;

  const rgba = Buffer.alloc(w * h * 4);
  if (mode === 'bordado') {
    fillFabric(rgba, w, h);
  } else {
    for (let i = 0; i < w * h * 4; i += 4) {
      rgba[i + 0] = 255;
      rgba[i + 1] = 255;
      rgba[i + 2] = 255;
      rgba[i + 3] = 255;
    }
  }

  if (mode === 'bordado') {
    // Grosor del hilo proporcional a las dimensiones reales del bordado:
    // las coordenadas de los formatos son unidades de 0,1 mm, así que el
    // radio se deriva de la escala píxel/unidad. Satén y tatami quedan como
    // hebras delgadas, no tubos gruesos (radio capado a ~2 px de salida).
    const radius = Math.max(0.7, Math.min(2.2, 1.8 * scale));
    for (let i = 1; i < stitches.length; i++) {
      const a = stitches[i - 1];
      const b = stitches[i];
      if (a.jump || b.jump) continue; // salto de aguja: no dibujar hilo
      const x0 = Math.floor(a.x * scale + ox);
      const y0 = Math.floor(a.y * scale + oy);
      const x1 = Math.floor(b.x * scale + ox);
      const y1 = Math.floor(b.y * scale + oy);
      // Color del bloque al que llega la puntada (fallback gris).
      const c = colors[b.color] || colors[a.color];
      const rgb = c ? [c.r, c.g, c.b] : [120, 120, 120];
      drawThread(rgba, w, h, x0, y0, x1, y1, rgb, radius);
    }
  } else {
    for (let i = 1; i < stitches.length; i++) {
      const a = stitches[i - 1];
      const b = stitches[i];
      if (a.jump || b.jump) continue; // salto de aguja: no dibujar hilo
      const x0 = Math.floor(a.x * scale + ox);
      const y0 = Math.floor(a.y * scale + oy);
      const x1 = Math.floor(b.x * scale + ox);
      const y1 = Math.floor(b.y * scale + oy);
      drawLine(rgba, w, h, x0, y0, x1, y1);
    }
  }

  return { png: pngEncode(w, h, rgba), width: w, height: h, bounds: { minX, minY, maxX, maxY } };
}

// ─── Fondo de tela (canvas/twill suave con ruido determinista) ─────────────

function fillFabric(rgba, w, h) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Patrón de tejido fino (twill 2/1) + ruido perceptivo determinista.
      const wx = x & 3;
      const wy = y & 3;
      const weave = ((wx + wy) & 1) ? -4 : 5;
      const noise = Math.round((hashNoise(x, y) - 0.5) * 7);
      let v = 243 + weave + noise;
      if (v < 232) v = 232;
      if (v > 251) v = 251;
      const i = (y * w + x) * 4;
      rgba[i + 0] = v;
      rgba[i + 1] = v - 1;
      rgba[i + 2] = v - 3;
      rgba[i + 3] = 255;
    }
  }
}

// Ruido pseudoaleatorio determinista (estable entre renders).
function hashNoise(x, y) {
  let n = (x * 374761393 + y * 668265263) ^ 0x7b3b9a1f;
  n = (n ^ (n >>> 13)) * 1274126177;
  n ^= n >>> 16;
  return ((n >>> 0) & 0xffff) / 0xffff;
}

// ─── Mezcla alfa manual sobre el buffer RGBA ───────────────────────────────
// El encoder PNG del proyecto escribe RGB plano (sin canal alpha), así que el
// sombreado/brillo se compone aquí con blending normal por píxel.
function blendPixel(rgba, w, h, x, y, [r, g, b], alpha) {
  if (x < 0 || x >= w || y < 0 || y >= h || alpha <= 0) return;
  const i = (y * w + x) * 4;
  const a = alpha / 255;
  const inv = 1 - a;
  rgba[i + 0] = Math.min(255, Math.round(r * a + rgba[i + 0] * inv));
  rgba[i + 1] = Math.min(255, Math.round(g * a + rgba[i + 1] * inv));
  rgba[i + 2] = Math.min(255, Math.round(b * a + rgba[i + 2] * inv));
  rgba[i + 3] = 255;
}

// Cobertura antialiasing de un píxel (qx, qy) respecto al segmento que va de
// (0,0) a (dx, dy), con radio dado. Devuelve 0..1 (0 fuera, 1 centro).
function capsuleCoverage(qx, qy, dx, dy, len2, radius) {
  let t = 0;
  if (len2 > 0) t = Math.max(0, Math.min(1, (qx * dx + qy * dy) / len2));
  const d = Math.hypot(qx - t * dx, qy - t * dy);
  return Math.min(1, Math.max(0, radius + 0.5 - d));
}

// Hilo con acabado tipo TrueView (iluminación difusa y suave), en UNA pasada
// por puntada sobre el bounding box expandido:
//   1. Sombra tenue desfasada un píxel hacia abajo-derecha (volumen leve).
//   2. Delineado fino: borde inferior apenas oscurecido.
//   3. Cuerpo del hilo en el color del bloque.
//   4. Brillo difuso muy suave hacia arriba-izquierda, más intenso en tramos
//      largos (satén/relleno) pero sin resaltes duros.
function drawThread(rgba, w, h, x0, y0, x1, y1, base, radius) {
  const shadow = [
    Math.round(base[0] * 0.72),
    Math.round(base[1] * 0.72),
    Math.round(base[2] * 0.72),
  ];
  const dark = [
    Math.round(base[0] * 0.85),
    Math.round(base[1] * 0.85),
    Math.round(base[2] * 0.85),
  ];
  const bright = [
    Math.round(base[0] + (255 - base[0]) * 0.25),
    Math.round(base[1] + (255 - base[1]) * 0.25),
    Math.round(base[2] + (255 - base[2]) * 0.25),
  ];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  // Los trazos largos (satén/relleno) captan un poco más de luz.
  const sheen = len2 >= 36 ? 60 : 40;
  const rDark = Math.max(0.4, radius - 1);
  const rBright = Math.max(0.4, radius - 1);

  const pad = Math.ceil(radius) + 1;
  const minX = Math.max(0, Math.floor(Math.min(x0, x1)) - pad - 1);
  const maxX = Math.min(w - 1, Math.ceil(Math.max(x0, x1)) + pad + 1);
  const minY = Math.max(0, Math.floor(Math.min(y0, y1)) - pad - 1);
  const maxY = Math.min(h - 1, Math.ceil(Math.max(y0, y1)) + pad + 1);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const qx = x + 0.5 - x0;
      const qy = y + 0.5 - y0;
      // Guarda barato: distancia del píxel al segmento (cuerpo). Si queda más
      // allá de radio + 1, ningún efecto (sombra/borde/brillo a 1px) aplica.
      let t = 0;
      if (len2 > 0) t = Math.max(0, Math.min(1, (qx * dx + qy * dy) / len2));
      const dBody = Math.hypot(qx - t * dx, qy - t * dy);
      if (dBody > radius + 1) continue;
      // 1) Sombra tenue (drop shadow leve) hacia abajo-derecha.
      const covShadow = capsuleCoverage(qx - 1, qy - 1, dx, dy, len2, radius);
      if (covShadow > 0) blendPixel(rgba, w, h, x, y, shadow, 45 * covShadow);
      // 2) Borde inferior apenas oscurecido.
      const covDark = capsuleCoverage(qx, qy - 1, dx, dy, len2, rDark);
      if (covDark > 0) blendPixel(rgba, w, h, x, y, dark, 55 * covDark);
      // 3) Cuerpo del hilo.
      const cov = capsuleCoverage(qx, qy, dx, dy, len2, radius);
      if (cov > 0) blendPixel(rgba, w, h, x, y, base, 255 * cov);
      // 4) Brillito difuso (satinado suave) hacia arriba-izquierda.
      const covBright = capsuleCoverage(qx + 1, qy + 1, dx, dy, len2, rBright);
      if (covBright > 0) blendPixel(rgba, w, h, x, y, bright, sheen * covBright);
    }
  }
}

// Dibuja una línea de 1px (esquema "puntos") sobre el buffer RGBA.
function drawLine(rgba, w, h, x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let guard = 0;
  while (guard++ < 100000) {
    if (x0 >= 0 && x0 < w && y0 >= 0 && y0 < h) {
      const i = (y0 * w + x0) * 4;
      rgba[i + 0] = 30;
      rgba[i + 1] = 30;
      rgba[i + 2] = 30;
      rgba[i + 3] = 255;
    }
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

export function parseDesign(buf, filename) {
  const ext = String(filename || '').split('.').pop().toLowerCase();
  let parsed;
  if (ext === 'jef') parsed = parseJEF(buf);
  else if (ext === 'dst') parsed = parseDST(buf);
  else if (ext === 'pes') parsed = parsePES(buf);
  else throw new Error(`Formato no soportado: .${ext || '?'}`);

  return {
    format: ext.toUpperCase(),
    stitches: parsed.stitches.length,
    colors: parsed.colors,
    colorCount: parsed.colorCount || parsed.colors.length,
  };
}

export function preview(buf, filename, size = 512, mode = 'puntos') {
  const ext = String(filename || '').split('.').pop().toLowerCase();
  let parsed;
  if (ext === 'jef') parsed = parseJEF(buf);
  else if (ext === 'dst') parsed = parseDST(buf);
  else if (ext === 'pes') parsed = parsePES(buf);
  else throw new Error(`Formato no soportado: .${ext || '?'}`);

  const rendered = render(parsed.stitches, size, parsed.colors, mode);
  return {
    dataUrl: `data:image/png;base64,${rendered.png.toString('base64')}`,
    width: rendered.width,
    height: rendered.height,
  };
}

export function designCacheKey(buf) {
  return crypto.createHash('sha1').update(buf).digest('hex');
}

// --- Multipart mínimo -------------------------------------------------------
// El server no usa librería de uploads; parseamos el body `multipart/form-data`
// y extraemos el primer campo de tipo archivo. Devuelve { name, buf } o null.
// El body completo ya está en memoria (express limita el json a 10mb; para el
// binario leemos el stream raw con un límite propio).
export function parseMultipart(buf, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  const boundary = (match && (match[1] || match[2])) || '';
  if (!boundary) return null;
  const delim = Buffer.from(`--${boundary}`);
  const parts = splitMultipart(buf, delim);
  for (const part of parts) {
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd < 0) continue;
    const header = part.slice(0, headerEnd).toString('latin1');
    const body = part.slice(headerEnd + 4);
    // Solo nos interesa un campo de archivo llamado "file".
    const isFileField = /name="file"/i.test(header) && /content-type:/i.test(header);
    if (!isFileField) continue;
    const nameMatch = /filename="([^"]*)"/i.exec(header);
    return { name: nameMatch ? nameMatch[1] : 'archivo.design', buf: body };
  }
  return null;
}

function splitMultipart(buf, delim) {
  const parts = [];
  let idx = buf.indexOf(delim);
  while (idx >= 0) {
    const start = idx + delim.length;
    // Fin del mensaje si sigue "--".
    if (buf[start] === 0x2d && buf[start + 1] === 0x2d) break;
    let end = buf.indexOf(delim, start);
    if (end < 0) break;
    // Recortamos el CRLF inicial del contenido.
    let from = buf[start] === 0x0d && buf[start + 1] === 0x0a ? start + 2 : start;
    // Y el CRLF final que precede al siguiente delimitador.
    let to = end;
    if (buf[to - 1] === 0x0a) to -= 1;
    if (buf[to - 1] === 0x0d) to -= 1;
    parts.push(buf.slice(from, to));
    idx = end;
  }
  return parts;
}
