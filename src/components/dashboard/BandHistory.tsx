import React, { useMemo, useState } from 'react';
import {
  Footprints, Moon, HeartPulse, Flame, Timer, Gauge, Move,
  TrendingUp, TrendingDown, Crown, Target, CalendarDays
} from 'lucide-react';
import type { BandDayData, BandSettings } from '../../context/BandContext';
import { DAY_LABELS } from '../../context/BandContext';

// ─────────────────────────────────────────────
// DEFINICIÓN DE MÉTRICAS
// ─────────────────────────────────────────────

type MetricKey = 'steps' | 'sleep' | 'heart' | 'calories' | 'active' | 'spo2' | 'stress';
type RangeKey = '7d' | '30d' | '90d';

interface MetricDef {
  key: MetricKey;
  label: string;
  short: string;
  icon: React.ReactNode;
  color: string;
  unit: string;
  value: (d: BandDayData) => number;
  higherBetter: boolean;
  isAverage: boolean;
}

const METRICS: MetricDef[] = [
  { key: 'steps', label: 'Pasos', short: 'Pasos', icon: <Footprints size={15} />, color: '#38BDF8', unit: '', value: d => d.steps, higherBetter: true, isAverage: false },
  { key: 'sleep', label: 'Sueño total', short: 'Sueño', icon: <Moon size={15} />, color: '#8B5CF6', unit: ' min', value: d => d.sleep.deepMin + d.sleep.lightMin + d.sleep.remMin, higherBetter: true, isAverage: false },
  { key: 'heart', label: 'Frec. cardíaca', short: 'FC', icon: <HeartPulse size={15} />, color: '#F43F5E', unit: ' bpm', value: d => d.heartRate.avg, higherBetter: false, isAverage: true },
  { key: 'calories', label: 'Calorías activas', short: 'Calorías', icon: <Flame size={15} />, color: '#F59E0B', unit: ' kcal', value: d => d.calories, higherBetter: true, isAverage: false },
  { key: 'active', label: 'Minutos activos', short: 'Activos', icon: <Timer size={15} />, color: '#EC4899', unit: ' min', value: d => d.activeMinutes, higherBetter: true, isAverage: false },
  { key: 'spo2', label: 'SpO₂ promedio', short: 'SpO₂', icon: <Gauge size={15} />, color: '#10B981', unit: '%', value: d => d.spo2 ?? 0, higherBetter: true, isAverage: true },
  { key: 'stress', label: 'Estrés promedio', short: 'Estrés', icon: <Move size={15} />, color: '#f97316', unit: '/100', value: d => d.stress ?? 0, higherBetter: false, isAverage: true },
];

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '7d', label: '7 días', days: 7 },
  { key: '30d', label: '30 días', days: 30 },
  { key: '90d', label: '90 días', days: 90 },
];

// ─────────────────────────────────────────────
// HELPERS DE FECHA / FORMATO
// ─────────────────────────────────────────────

function pad(n: number): string { return String(n).padStart(2, '0'); }

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDaysISO(iso: string, delta: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return toISO(d);
}

function fmtNum(v: number): string {
  if (v >= 1000) return `${(v / 1000).toLocaleString('es-CL', { maximumFractionDigits: 1 })}k`;
  return v.toLocaleString('es-CL', { maximumFractionDigits: 0 });
}

function fmtUsable(v: number, m: MetricDef): string {
  if (m.isAverage) return `${v.toFixed(1)}${m.unit}`;
  return `${Math.round(v).toLocaleString('es-CL')}${m.unit}`;
}

function fmtDateLong(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' });
}

type BucketMode = 'day' | 'week' | 'month';

interface Bucket { key: string; label: string; value: number; count: number; }

function bucketModeFor(days: number): BucketMode {
  if (days <= 7) return 'day';
  if (days <= 30) return 'week';
  return 'month';
}

// ─────────────────────────────────────────────
// AGREGACIÓN
// ─────────────────────────────────────────────

function avgOf(list: BandDayData[], m: MetricDef): number {
  return list.length === 0 ? 0 : list.reduce((s, d) => s + m.value(d), 0) / list.length;
}

function sumOf(list: BandDayData[], m: MetricDef): number {
  return list.reduce((s, d) => s + m.value(d), 0);
}

function valueOf(list: BandDayData[], m: MetricDef): number {
  return m.isAverage ? avgOf(list, m) : sumOf(list, m);
}

function inRange(days: BandDayData[], startISO: string, endISO: string): BandDayData[] {
  return days.filter(d => d.date >= startISO && d.date <= endISO);
}

// ─────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────

const rangeBtn = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
  border: active ? '1px solid rgba(52,211,153,0.35)' : '1px solid rgba(255,255,255,0.08)',
  color: active ? '#16F0B5' : 'rgba(255,255,255,0.7)',
  borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
});

const metricBtn = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.03)',
  border: active ? '1px solid rgba(22,240,181,0.35)' : '1px solid rgba(255,255,255,0.08)',
  color: active ? '#16F0B5' : 'rgba(255,255,255,0.7)',
  borderRadius: '10px', padding: '8px 12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
});

function deltaTone(diffPct: number | null, higherBetter: boolean): string {
  if (diffPct === null || Math.abs(diffPct) < 0.05) return '#64748b';
  const good = higherBetter ? diffPct > 0 : diffPct < 0;
  return good ? '#34d399' : '#F87171';
}

const DetailChip: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px' }}>
    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-subtle)' }}>{label}</div>
    <div style={{ fontSize: '18px', fontWeight: 700, color, marginTop: '4px' }}>{value}</div>
  </div>
);

// ─────────────────────────────────────────────
// COMPONENTE HISTORIAL
// ─────────────────────────────────────────────

export const BandHistory: React.FC<{ days: BandDayData[]; settings: BandSettings }> = ({ days, settings }) => {
  const [metricKey, setMetricKey] = useState<MetricKey>('steps');
  const [rangeKey, setRangeKey] = useState<RangeKey>('30d');

  const metric = METRICS.find(m => m.key === metricKey)!;
  const range = RANGES.find(r => r.key === rangeKey)!;

  const todayISOStr = toISO(new Date());
  const curStart = addDaysISO(todayISOStr, -(range.days - 1));
  const prevEnd = addDaysISO(curStart, -1);
  const prevStart = addDaysISO(prevEnd, -(range.days - 1));

  const curDays = useMemo(() => inRange(days, curStart, todayISOStr), [days, curStart, todayISOStr]);
  const prevDays = useMemo(() => inRange(days, prevStart, prevEnd), [days, prevStart, prevEnd]);

  const currentValue = valueOf(curDays, metric);
  const previousValue = valueOf(prevDays, metric);
  const diffPct = previousValue !== 0 ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100 : null;

  const bestDay = curDays.reduce<BandDayData | null>((acc, d) => (!acc || metric.value(d) > metric.value(acc) ? d : acc), null);
  const worstDay = curDays.reduce<BandDayData | null>((acc, d) => (!acc || metric.value(d) < metric.value(acc) ? d : acc), null);

  const goalHits = curDays.filter(d => d.steps >= settings.goalSteps).length;

  // mejor día de la semana por promedio de pasos
  const byWeekday = useMemo(() => {
    const acc = new Map<number, { sum: number; count: number }>();
    curDays.forEach(d => {
      const wd = (new Date(d.date + 'T12:00:00').getDay() + 6) % 7;
      const e = acc.get(wd) ?? { sum: 0, count: 0 };
      e.sum += d.steps;
      e.count += 1;
      acc.set(wd, e);
    });
    let bestWd = 0;
    let bestAvg = -1;
    acc.forEach((e, wd) => {
      if (e.sum / e.count > bestAvg) { bestAvg = e.sum / e.count; bestWd = wd; }
    });
    return { bestWd, bestAvg };
  }, [curDays]);

  const avgStress = avgOf(curDays, METRICS.find(m => m.key === 'stress')!);
  const avgSpo2 = avgOf(curDays, METRICS.find(m => m.key === 'spo2')!);
  const totalSleep = useMemo(() => sumOf(curDays, METRICS.find(m => m.key === 'sleep')!) / Math.max(1, curDays.length), [curDays]);

  const buckets = useMemo(() => groupMembers(curDays, bucketModeFor(range.days), metric), [curDays, range.days, metric]);
  const maxBar = Math.max(...buckets.map(b => b.value), 1);

  return (
    <div className="module-container fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CalendarDays size={28} color="#16F0B5" /> Historial de actividad
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0 0' }}>
            Compara períodos, detecta tendencias y saca tus datos más críticos.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRangeKey(r.key)} style={rangeBtn(rangeKey === r.key)}>{r.label}</button>
          ))}
        </div>
      </div>

      {/* Selector de métrica */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {METRICS.map(m => (
          <button key={m.key} onClick={() => setMetricKey(m.key)} style={metricBtn(m.key === metricKey)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>{m.icon}{m.short}</span>
          </button>
        ))}
      </div>

      {/* Tarjetas principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <StatCard label={`Último ${range.label}`} value={fmtUsable(currentValue, metric)} sub={metric.label} />
        <StatCard
          label="Período anterior"
          value={fmtUsable(previousValue, metric)}
          sub={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: deltaTone(diffPct, metric.higherBetter) }}>
              {diffPct === null || Math.abs(diffPct) < 0.05 ? 'sin cambio' : (
                <>
                  {diffPct > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {diffPct > 0 ? '+' : ''}{diffPct.toFixed(1)}% vs anterior
                </>
              )}
            </span>
          }
        />
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Crown size={13} color="#fbbf24" /> Mejor día
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#38BDF8', marginTop: '6px' }}>
            {bestDay ? fmtUsable(metric.value(bestDay), metric) : '—'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '2px', textTransform: 'capitalize' }}>
            {bestDay ? fmtDateLong(bestDay.date) : '—'}
          </div>
        </div>
        <StatCard
          label="Meta de pasos"
          value={`${goalHits}/${curDays.length}`}
          sub={`Objetivo diario: ${settings.goalSteps.toLocaleString('es-CL')} · ${curDays.length ? Math.round((goalHits / curDays.length) * 100) : 0}% cumplido`}
        />
      </div>

      {/* Datos críticos */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={16} color="#fbbf24" /> Datos más críticos
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <DetailChip label="Día de la semana más activo" value={DAY_LABELS[byWeekday.bestWd]} color="#38BDF8" />
          <DetailChip label="Promedio de sueño / noche" value={`${fmtNum(totalSleep)} min`} color="#8B5CF6" />
          <DetailChip label="Estrés promedio" value={`${avgStress.toFixed(1)} / 100`} color="#f97316" />
          <DetailChip label="SpO₂ promedio" value={`${avgSpo2.toFixed(1)}%`} color="#10B981" />
        </div>
        {worstDay && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '14px', marginBottom: 0 }}>
            Día con menor {metric.label.toLowerCase()}: <b style={{ color: 'white' }}>{fmtDateLong(worstDay.date)}</b> ({fmtUsable(metric.value(worstDay), metric)}).
          </p>
        )}
      </div>

      {/* Gráfica de barras */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: metric.color }}>{metric.icon}</span> {metric.label} · {range.label}
        </h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '150px' }}>
          {buckets.length === 0 && <p style={{ color: 'var(--text-subtle)', fontSize: '13px' }}>Sin datos en este rango.</p>}
          {buckets.map((b, i) => {
            const h = Math.max(6, (b.value / maxBar) * 100);
            return (
              <div key={b.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-subtle)' }}>{fmtNum(b.value)}</span>
                <div style={{
                  width: '100%', borderRadius: '6px 6px 0 0', height: `${h}px`,
                  background: i === buckets.length - 1 ? 'var(--accent-green)' : metric.color,
                  opacity: i === buckets.length - 1 ? 1 : 0.45,
                  transition: 'height 0.3s'
                }} />
                <span style={{ fontSize: '0.62rem', color: 'var(--text-subtle)' }}>{b.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabla por día */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarDays size={16} color="#60bdf8" /> Desglose por día · último {range.label}
        </h3>
        {curDays.length === 0 && <p style={{ color: 'var(--text-subtle)', fontSize: '13px' }}>Sin datos en este rango.</p>}
        {curDays.length > 0 && (
          <div style={{ overflowX: 'auto', maxHeight: '320px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                <tr style={{ color: 'var(--text-subtle)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid var(--border-color)' }}>Día</th>
                  {METRICS.slice(0, 7).map(m => (
                    <th key={m.key} style={{ textAlign: 'right', padding: '6px 10px', borderBottom: '1px solid var(--border-color)', color: m.color }}>{m.short}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...curDays].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 61).map(d => (
                  <tr key={d.date}>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'white' }}>{fmtDateLong(d.date)}</td>
                    {METRICS.map(m => (
                      <td key={m.key} style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {fmtUsable(m.value(d), m)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// SUB-COMPONENTES / HELPERS LOCAL
// ─────────────────────────────────────────────

function groupMembers(list: BandDayData[], mode: BucketMode, m: MetricDef): Bucket[] {
  const map = new Map<string, { label: string; list: BandDayData[] }>();
  list.forEach(day => {
    const dt = new Date(day.date + 'T12:00:00');
    let key: string;
    let label: string;
    if (mode === 'day') {
      key = day.date;
      label = dt.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
    } else if (mode === 'week') {
      const dow = (dt.getDay() + 6) % 7;
      const monday = new Date(dt);
      monday.setDate(dt.getDate() - dow);
      key = toISO(monday);
      label = monday.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
    } else {
      key = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`;
      label = dt.toLocaleDateString('es-CL', { month: 'short' });
    }
    const e = map.get(key) ?? { label, list: [] };
    e.list.push(day);
    map.set(key, e);
  });
  const out: Bucket[] = [];
  map.forEach((e, key) => {
    const isAvg = m.isAverage;
    const value = isAvg
      ? e.list.reduce((s, d) => s + m.value(d), 0) / e.list.length
      : e.list.reduce((s, d) => s + m.value(d), 0);
    out.push({ key, label: e.label, value, count: e.list.length });
  });
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

const StatCard: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; color?: string }> = ({ label, value, sub, color }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-subtle)' }}>{label}</div>
    <div style={{ fontSize: '22px', fontWeight: 700, color: color ?? 'white', marginTop: '6px' }}>{value}</div>
    {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '4px' }}>{sub}</div>}
  </div>
);

export default BandHistory;