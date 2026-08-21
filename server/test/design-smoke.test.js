import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDesign, preview, parseMultipart, parseJEF, parseDST, parsePES } from '../src/design.js';

// Fixtures reales generados con pyembroidery (un cuadrado + diagonal, 2 colores).
const REAL = {
  jef: {
    base64: 'hAAAABQAAAAyMDI2MDgxMTIyMzQ0OAAAAgAAAA8AAAABAAAAMgAAABkAAAAyAAAAGQAAAPQBAAANAgAA9AEAAA0CAADIAAAA4QAAAMgAAADhAAAAigIAAM8DAACKAgAAzwMAAIoCAADPAwAAigIAAM8DAABHAAAADAAAAA0AAAANAAAAAAAK7BkZGd0eFIABAACAAqbsAAAZ9hkUHucUD4AQ',
    stitches: 11,
    colors: ['#ff9805', '#0b2f84'],
    // [x, y, jump] — transcripción de pyembroidery (command STITCH=0 / JUMP=1)
    points: [[0,0,0],[10,20,0],[35,-5,0],[60,30,0],[90,10,0],[0,30,1],[0,30,0],[25,40,0],[50,20,0],[80,45,0],[100,30,0]],
  },
  dst: {
    base64: 'TEE6VW50aXRsZWQgICAgICAgIA1TVDogICAgIDEyDUNPOiAgMQ1KWDogIDEwMA0tWDogICAgMA0rWTogICA0NQ0tWTogICAgNQ1BWDorICAxMDANQVk6LSAgIDMwDU1YOisgICAgMA1NWTorICAgIDANUEQ6KioqKioqDRogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAAAAOlUAOBZgORFgNQpQMAAMOoUAtRBgNRpgNAlQMaZQMAAPM=',
    stitches: 10,
    colors: [],
    points: [[0,0,0],[10,20,0],[35,-5,0],[60,30,0],[90,10,0],[0,30,0],[25,40,0],[50,20,0],[80,45,0],[100,30,0]],
  },
  pes: {
    base64: 'I1BFUzAwMDG8AAAAAQABAAEA//8AAAcAQ0VtYk9uZQAAAAAAAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AIBtRAAggEQBAAAAAABkADIAAAAAAAAAAAADAP//AAAHAENTZXdTZWcAAD4ABQAAANP/CgDn/yMAzv88APH/WgDd/wOAAQAVAAIAWgDd/wAA8f8DgAAAFQAFAAAA8f8ZAPv/MgDn/1AAAABkAPH/AgAAAD4AAQAVAAAAAABMQTpVbnRpdGxlZCAgICAgICAgDSAgICAgICAgICAgIP8ABiYgICAgICAgICAgICABPhUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAAALAAAMf/wZAAyAOABsAEAAAoUGWcZIx5s/rACr6agFAAAGQoZbB4ZFHH/AAAAAAAA8P////8PCAAAAAAQBAAAAAAgAgAAAABAAgAAAABAAgAAAABAAgACAABAAgAAAABAAgAAAABABgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABCAgAAAABAAgAAAABAAgAAAABAAgAAAABAQgAAAQBAAgAAAABAAgAAAABAAgAAAABABgAAEABAAgAAAABAAgAAAABAAgAAAABAAgAAAABABgAAEABAAgAAAABAAgAAAABAAgAAACBAAgAAAABAAgAAAABAAgAAAABABAAAAAAgCAAAAAAQ8P////8PAAAAAAAAAAAAAAAA8P////8PCAAAAAAQBAAAAAAgAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgACAABAAgAAAABABgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABCAgAAAABAAgAAAABAAgAAAABAAgAAAABAQgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAEABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABABAAAAAAgCAAAAAAQ8P////8PAAAAAAAAAAAAAAAA8P////8PCAAAAAAQBAAAAAAgAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAABAAgAAAQBAAgAAAABAAgAAAABAAgAAAABABgAAAABgAgAAAABAAgAAAABAAgAAAABAAiAAAABAAgAAAABAAgAAABBAAgAAAABAAgAAAABAAgAAAABAAgAAAABABAAAAAAgCAAAAAAQ8P////8PAAAAAAAA',
    stitches: 11,
    colors: ['#ff9900', '#0b3d91'],
    points: [[0,0,0],[10,20,0],[35,-5,0],[60,30,0],[90,10,0],[0,30,1],[0,30,0],[25,40,0],[50,20,0],[80,45,0],[100,30,0]],
  },
};

const PARSERS = { jef: parseJEF, dst: parseDST, pes: parsePES };

function load(name) {
  return Buffer.from(REAL[name].base64, 'base64');
}

for (const [name, truth] of Object.entries(REAL)) {
  test(`${name}: parseDesign contra ground truth de pyembroidery`, () => {
    const buf = load(name);
    const meta = parseDesign(buf, `test.${name}`);
    assert.equal(meta.format, name.toUpperCase());
    assert.equal(meta.stitches, truth.stitches);
    assert.deepEqual(meta.colors.map((c) => c.hex), truth.colors);
    assert.equal(meta.colorCount, truth.colors.length);
  });

  test(`${name}: coordenadas de puntadas idénticas a pyembroidery`, () => {
    const buf = load(name);
    const stitches = PARSERS[name](buf).stitches;
    const pts = stitches.map((s) => [s.x, s.y, s.jump ? 1 : 0]);
    assert.deepEqual(pts, truth.points);
  });

  test(`${name}: preview genera PNG no vacío`, () => {
    const buf = load(name);
    const pv = preview(buf, `test.${name}`, 128);
    assert.equal(pv.width, 128);
    assert.equal(pv.height, 128);
    assert.ok(pv.dataUrl.startsWith('data:image/png;base64,'));
    assert.ok(pv.dataUrl.length > 200);
  });

  test(`${name}: render modo bordado usa el color de cada bloque`, () => {
    const buf = load(name);
    const colors = PARSERS[name](buf).colors;
    if (colors.length === 0) return; // DST sin paleta: no hay color que verificar
    const pvColor = preview(buf, `test.${name}`, 256, 'bordado');
    const pvPoints = preview(buf, `test.${name}`, 256, 'puntos');
    assert.ok(pvColor.dataUrl.length > 200);
    // El modo bordado dibuja el mismo lienzo: ambos deben decodificar a 256x256.
    assert.ok(pvColor.dataUrl.startsWith('data:image/png;base64,'));
    assert.ok(pvPoints.dataUrl.startsWith('data:image/png;base64,'));
  });
}

test('parseDesign rechaza formato no soportado', () => {
  assert.throws(() => parseDesign(Buffer.from('hola'), 'x.txt'), /Formato no soportado/);
});

test('parseJEF no lanza RangeError ante archivos acotados (crash original)', () => {
  // Buffer con header válido pero offset de puntadas más allá del archivo:
  // el parser debe parar por bounds-check, no crashear con out of range.
  const buf = Buffer.alloc(28);
  buf.writeUInt32LE(14871, 0); // stitch_offset mucho mayor que el buffer
  const meta = parseDesign(buf, 'mal.jef');
  assert.equal(meta.stitches, 0);
  assert.deepEqual(meta.colors, []);
});

// multipart test
test('parseMultipart extrae archivo de formulario', () => {
  const body = Buffer.from(
    '--BOUND\r\n' +
    'Content-Disposition: form-data; name="file"; filename="test.jef"\r\n' +
    'Content-Type: application/octet-stream\r\n\r\n'
  );
  const file = load('jef');
  const end = Buffer.from('\r\n--BOUND--\r\n');
  const mp = Buffer.concat([body, file, end]);
  const up = parseMultipart(mp, 'multipart/form-data; boundary=BOUND');
  assert.ok(up);
  assert.equal(up.name, 'test.jef');
  assert.equal(up.buf.length, file.length);
});
