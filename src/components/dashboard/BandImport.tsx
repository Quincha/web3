import React, { useState } from 'react';
import {
  Upload, FileJson, FileSpreadsheet, Download, RotateCcw, CheckCircle2,
  AlertTriangle, Info, Database
} from 'lucide-react';
import { useBand } from '../../context/BandContext';
import type { BandDayData, Workout, WorkoutMode } from '../../context/BandContext';
import { WORKOUT_MODE_LABELS } from '../../context/BandContext';

// ─────────────────────────────────────────────
// TIPOS / HELPERS
// ─────────────────────────────────────────────

type RawRow = Record<string, unknown>;

const MODES = Object.keys(WORKOUT_MODE_LABELS) as WorkoutMode[];

function pad2(n: number): string { return String(n).padStart(2, '0'); }

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.trim().replace(',', '.').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function read(row: RawRow, keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
    const lk = k.toLowerCase();
    if (lk !== k && row[lk] !== undefined && row[lk] !== null && row[lk] !== '') return row[lk];
  }
  return undefined;
}

function pickNum(row: RawRow, keys: string[]): number | null {
  const v = read(row, keys);
  return toNum(v);
}

function pickStr(row: RawRow, keys: string[]): string | null {
  const v = read(row, keys);
  return v === undefined ? null : String(v).trim();
}

function normalizeDate(v: unknown): string | null {
  const s = String(v ?? '').trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${pad2(+m[2])}-${pad2(+m[3])}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) {
    const first = +m[1], second = +m[2];
    const day = first > 12 ? second : first;
    const month = first > 12 ? first : second;
    return `${m[3]}-${pad2(month)}-${pad2(day)}`;
  }
  m = /^(\d{4})-(\d{2})-(\d{2})T/.exec(s);
  if (m) return m[1];
  return null;
}

// claves canónicas → alias aceptados (camelCase y snake_case, EN/ES)
const FIELDS: Record<string, string[]> = {
  date: ['date', 'fecha', 'day'],
  steps: ['steps', 'pasos'],
  distanceKm: ['distanceKm', 'distance_km', 'distance', 'distancia', 'km'],
  calories: ['calories', 'kcal', 'calorias'],
  activeMinutes: ['activeMinutes', 'active_min', 'activeMin', 'active_minutes', 'minutos_activos', 'active'],
  hrAvg: ['hrAvg', 'hr_avg', 'avg', 'heartRateAvg', 'heart_rate_avg', 'bpm'],
  hrResting: ['hrResting', 'hr_resting', 'resting', 'heartRateResting'],
  hrMin: ['hrMin', 'hr_min', 'min', 'heartRateMin'],
  hrMax: ['hrMax', 'hr_max', 'max', 'heartRateMax'],
  spo2: ['spo2', 'sp02', 'spo', 'oxigeno'],
  stress: ['stress', 'stres', 'estres'],
  pai: ['pai', 'pa'],
  energy: ['energy', 'energia'],
  sleepDeep: ['sleepDeep', 'sleep_deep', 'sleepDeepMin', 'sleep_deep_min', 'deepMin', 'sleep_deepMin', 'deep'],
  sleepLight: ['sleepLight', 'sleep_light', 'sleepLightMin', 'sleep_light_min', 'lightMin', 'sleep_lightMin', 'light'],
  sleepRem: ['sleepRem', 'sleep_rem', 'sleepRemMin', 'sleep_rem_min', 'remMin', 'sleep_remMin', 'rem'],
  sleepAwake: ['sleepAwake', 'sleep_awake', 'sleepAwakeMin', 'sleep_awake_min', 'awakeMin', 'sleep_awakeMin', 'awake'],
  sleepTotal: ['sleepTotal', 'sleep_total', 'sleep', 'duration'],
  lastSyncAt: ['lastSyncAt', 'last_sync_at', 'lastsync'],
};

function normalizeSleep(row: RawRow): BandDayData['sleep'] {
  const deep = pickNum(row, FIELDS.sleepDeep);
  const light = pickNum(row, FIELDS.sleepLight);
  const rem = pickNum(row, FIELDS.sleepRem);
  const awake = pickNum(row, FIELDS.sleepAwake);
  if (deep !== null || light !== null || rem !== null || awake !== null) {
    return { deepMin: deep ?? 0, lightMin: light ?? 0, remMin: rem ?? 0, awakeMin: awake ?? 0 };
  }
  const total = pickNum(row, FIELDS.sleepTotal);
  if (total && total > 0) {
    return {
      deepMin: Math.round(total * 0.18),
      lightMin: Math.round(total * 0.55),
      remMin: Math.round(total * 0.22),
      awakeMin: Math.round(total * 0.05),
    };
  }
  return { deepMin: 0, lightMin: 0, remMin: 0, awakeMin: 0 };
}

function normalizeWorkoutList(raw: unknown): Workout[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((w): w is RawRow => typeof w === 'object' && w !== null)
    .map(w => {
      const mode = pickStr(w, ['mode', 'tipo']);
      return {
        id: pickStr(w, ['id']) ?? `wo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        mode: mode && MODES.includes(mode as WorkoutMode) ? mode as WorkoutMode : 'freestyle',
        durationMin: pickNum(w, ['durationMin', 'duration', 'minutes', 'min']) ?? 0,
        calories: pickNum(w, ['calories', 'kcal']) ?? 0,
        distanceKm: pickNum(w, ['distanceKm', 'distance_km', 'distance']) ?? 0,
        heartRateAvg: pickNum(w, ['heartRateAvg', 'hr_avg']) ?? 0,
        heartRateMax: pickNum(w, ['heartRateMax', 'hr_max']) ?? 0,
      };
    });
}

function normalizeDay(row: RawRow): BandDayData | null {
  const date = normalizeDate(pickStr(row, FIELDS.date) ?? '');
  if (!date) return null;

  const hr = (typeof row.heartRate === 'object' && row.heartRate !== null)
    ? { ...row, ...(row.heartRate as unknown as RawRow) }
    : row;
  const sleep = (typeof row.sleep === 'object' && row.sleep !== null)
    ? { ...row, ...(row.sleep as unknown as RawRow) }
    : row;
  const hrAvg = pickNum(hr, FIELDS.hrAvg);
  const hrResting = pickNum(hr, FIELDS.hrResting);
  const hrMin = pickNum(hr, FIELDS.hrMin);
  const hrMax = pickNum(hr, FIELDS.hrMax);

  const spo2 = pickNum(row, FIELDS.spo2);
  const stress = pickNum(row, FIELDS.stress);

  return {
    date,
    steps: pickNum(row, FIELDS.steps) ?? 0,
    distanceKm: pickNum(row, FIELDS.distanceKm) ?? 0,
    calories: pickNum(row, FIELDS.calories) ?? 0,
    activeMinutes: pickNum(row, FIELDS.activeMinutes) ?? 0,
    heartRate: { avg: hrAvg ?? 0, resting: hrResting ?? 0, min: hrMin ?? 0, max: hrMax ?? 0 },
    spo2: spo2 === null ? null : spo2,
    stress: stress === null ? null : stress,
    pai: pickNum(row, FIELDS.pai) ?? 0,
    energy: pickNum(row, FIELDS.energy),
    sleep: normalizeSleep(sleep),
    workouts: normalizeWorkoutList(row.workouts),
    lastSyncAt: pickStr(row, FIELDS.lastSyncAt),
  };
}

// ─────────────────────────────────────────────────
// PARSE DE ARCHIVOS
// ─────────────────────────────────────────────────

const CSV_TEMPLATE = [
  'date,steps,distance_km,calories,active_min,hr_avg,hr_resting,hr_min,hr_max,spo2,stress,pai,energy,sleep_deep,sleep_light,sleep_rem,sleep_awake',
  '2024-01-01,10452,7.74,520,84,72,58,52,128,97,22,58,71,95,232,90,32',
  '2024-01-02,8123,6.02,410,61,70,59,51,122,96,34,7,64,88,210,85,41',
].join('\n');

function parseJSONText(text: string): { days: BandDayData[]; skipped: number } {
  const parsed: unknown = JSON.parse(text);
  const list: unknown[] = Array.isArray(parsed)
    ? parsed as unknown[]
    : typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as RawRow).days)
      ? (parsed as RawRow).days as unknown[]
      : [];
  if (list.length === 0) throw new Error('El JSON no contiene un array de días (o un objeto con "days").');
  const days: BandDayData[] = [];
  let skipped = 0;
  for (const raw of list) {
    if (typeof raw !== 'object' || raw === null) { skipped++; continue; }
    const day = normalizeDay(raw as RawRow);
    if (day) days.push(day); else skipped++;
  }
  return { days, skipped };
}

function parseCSVText(text: string): { days: BandDayData[]; skipped: number } {
  const delim = text.includes(';') && !text.includes(',') ? ';' : ',';
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('El CSV está vacío o muy corto.');
  const headers = lines[0].split(delim).map(h => h.trim().toLowerCase().replace(/[\u200c\ufeff]/g, ''));
  if (!headers.some(h => /date|fecha|day/.test(h))) throw new Error('Falta la columna "date" en el CSV.');
  const days: BandDayData[] = [];
  let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delim);
    const row: RawRow = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? ''; });
    const day = normalizeDay(row);
    if (day) days.push(day); else skipped++;
  }
  return { days, skipped };
}

// ─────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────

interface Preview {
  days: BandDayData[];
  filename: string;
  skipped: number;
  kind: 'json' | 'csv';
}

const box: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border-color)',
  borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px'
};

export const BandImport: React.FC = () => {
  const { days, dataSource, importDays, resetToSimulated } = useBand();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleText = (text: string, filename: string) => {
    setError(null);
    setResult(null);
    try {
      const lower = filename.toLowerCase();
      const isJson = lower.endsWith('.json') || lower.endsWith('.jsonl') || text.trim().startsWith('{') || text.trim().startsWith('[');
      const parsed = isJson ? parseJSONText(text) : parseCSVText(text);
      if (parsed.days.length === 0) { setError('No se reconoció ningún día válido. Asegúrate de incluir una columna "date" en formato YYYY-MM-DD.'); return; }
      setPreview({ days: parsed.days, filename, skipped: parsed.skipped, kind: isJson ? 'json' : 'csv' });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => handleText(String(reader.result ?? ''), f.name);
    reader.onerror = () => setError('No se pudo leer el archivo.');
    reader.readAsText(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const confirmImport = () => {
    if (!preview) return;
    const n = importDays(preview.days, 'imported');
    setResult(n > 0 ? `Se importaron ${n} días reales.` : 'No se importó nada.');
    setPreview(null);
  };

  const doReset = () => {
    resetToSimulated();
    setResult('Vuelto a datos simulados (120 días de ejemplo).');
    setPreview(null);
    setError(null);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mi-band-plantilla.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewTotalSteps = preview?.days.reduce((acc, d) => acc + d.steps, 0) ?? 0;
  const previewAvgSleep = preview?.days.length
    ? Math.round(preview.days.reduce((acc, d) => acc + d.sleep.deepMin + d.sleep.lightMin + d.sleep.remMin, 0) / preview.days.length)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* ESTADO ACTUAL */}
      <div style={{ ...box, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Database size={20} color={dataSource === 'imported' ? '#16F0B5' : '#64748B'} />
          <div>
            <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>
              {dataSource === 'imported' ? 'Datos reales importados' : 'Datos simulados'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{days.length} días guardados en el dashboard</div>
          </div>
        </div>
        {dataSource === 'imported' && (
          <button onClick={doReset} style={{ background: 'rgba(255,255,255,0.06)', color: '#F87171', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RotateCcw size={14} /> Volver a simulados
          </button>
        )}
      </div>

      {/* SUBIDA */}
      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Upload size={16} color="#60BDF8" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Importar datos reales</h3>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-subtle)', lineHeight: 1.6 }}>
          Sube un <b style={{ color: 'white' }}>JSON</b> (array de días con nuestro esquema, o un objeto con <code>days</code>) o un <b style={{ color: 'white' }}>CSV</b> con:<br />
          <code>date, steps, distance_km, calories, active_min, hr_avg, hr_resting, hr_min, hr_max, spo2, stress, pai, energy, sleep_deep, sleep_light, sleep_rem, sleep_awake</code>.
          Las columnas que falten se rellenan con 0; si solo das <code>sleep</code> total, se reparte entre fases.
        </p>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent-green)' : 'var(--border-color)'}`, borderRadius: '12px',
            padding: '32px 16px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'grid', rowGap: '8px', justifyContent: 'center', fontSize: 14, color: 'white' }}>
            <FileJson size={22} style={{ justifySelf: 'center' }} color="#60BDF8" />
            Arrastra tu export aquí o haz clic para seleccionarlo
            <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>.json · .csv</div>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept=".json,.csv,application/json,text/csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <button onClick={downloadTemplate} style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
          <Download size={14} /> Descargar plantilla CSV
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div style={{ ...box, borderColor: 'rgba(248,113,113,0.4)', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} color="#F87171" /><span style={{ fontSize: 13, color: '#F87171' }}>{error}</span>
        </div>
      )}

      {/* RESULTADO */}
      {result && (
        <div style={{ ...box, borderColor: 'rgba(52,211,153,0.4)', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={16} color="#34d399" /><span style={{ fontSize: 13, color: '#34d399' }}>{result}</span>
        </div>
      )}

      {/* PREVIEW */}
      {preview && (
        <div style={box}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
            {preview.kind === 'json' ? <FileJson size={16} color="#60BDF8" /> : <FileSpreadsheet size={16} color="#60BDF8" />}
            Vista previa · {preview.filename}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <Stat label="Días" value={String(preview.days.length)} />
            <Stat label="Inicio" value={preview.days[0]?.date ?? '—'} />
            <Stat label="Fin" value={preview.days[preview.days.length - 1]?.date ?? '—'} />
            <Stat label="Pasos totales" value={previewTotalSteps.toLocaleString('es-CL')} />
            <Stat label="Sueño prom. (min)" value={String(previewAvgSleep)} />
            {preview.skipped > 0 && <Stat label="Filas ignoradas" value={String(preview.skipped)} tint="#F87171" />}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
            Confirmar reemplaza los datos actuales del dashboard (los anteriores se pierden). Siempre puedes volver a las simulaciones con "Volver a simulados".
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={confirmImport} style={{ background: 'var(--accent-green)', color: '#0C1117', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={15} /> Importar {preview.days.length} días
            </button>
            <button onClick={() => setPreview(null)} style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* CÓMO OBTENER DATOS REALES */}
      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Info size={16} color="#60BDF8" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>¿De dónde salen los datos reales?</h3>
        </div>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
          <li>
            <b style={{ color: 'white' }}>Gadgetbridge (Android, libre):</b> vincula tu Mi Band 5, sincroniza unos días y exporta la base (SQLite). Convierte a nuestro JSON con <code>scripts/miband_export_to_json.py</code> y súbelo aquí.
          </li>
          <li>
            <b style={{ color: 'white' }}>Mi Fitness (Android/iOS):</b> exporta tus datos desde la app / página de Xiaomi; el exportador de respaldo genera <code>daily_summary.csv</code>. Úsalo tal cual o apréndelo a nuestro CSV.
          </li>
          <li>
            <b style={{ color: 'white' }}>Plantilla CSV:</b> si ya tienes los valores en Excel/Sheets, descarga la plantilla, pégalos y súbela.
          </li>
        </ol>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-subtle)' }}>
          Los datos se guardan solo en tu navegador (localStorage). El navegador no puede leer el BLE propietario de la Mi Band directamente, por eso se importa el respaldo sincronizado desde la app oficial.
        </p>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; tint?: string }> = ({ label, value, tint }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 12px' }}>
    <div style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: tint ?? 'white' }}>{value}</div>
  </div>
);

export default BandImport;