import React, { useState } from 'react';
import {
  ArrowLeft, Battery, Footprints, Flame, HeartPulse, Moon, Gauge,
  Award, Zap, Dumbbell, Bluetooth, RefreshCw, Plus, Trash2, Timer,
  Watch, Move, ArrowRight, CalendarDays, Bell, Settings as SettingsIcon, Upload, Database
} from 'lucide-react';
import { useBand } from '../../context/BandContext';
import type { BandDayData, WorkoutMode, Workout } from '../../context/BandContext';
import { WORKOUT_MODE_LABELS } from '../../context/BandContext';
import { BandHistory } from './BandHistory';
import { BandAlarms } from './BandAlarms';
import { BandSettingsPanel } from './BandSettingsPanel';
import { BandImport } from './BandImport';

type BandTab = 'today' | 'history' | 'alarms' | 'settings' | 'import';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function fmtTime(iso: string | null): string {
  if (!iso) return 'Nunca';
  const d = new Date(iso);
  return d.toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
}

function sleepTotal(s: BandDayData['sleep']): number {
  return s.deepMin + s.lightMin + s.remMin + s.awakeMin;
}

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

function localTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────────

const btnGhost: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
};

const btnPrimary: React.CSSProperties = {
  background: 'var(--accent-green)', color: '#0C1117', border: 'none',
  borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
};

const fieldLabel: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem',
  color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em'
};

const fieldInput: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
  borderRadius: '8px', padding: '8px 10px', color: 'white', fontSize: '14px', fontFamily: 'inherit',
  width: '100%'
};

// ─────────────────────────────────────────────
// TARJETAS DE MÉTRICA
// ─────────────────────────────────────────────

interface MetricCardProps {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: string;
  sub?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, color, label, value, sub }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color }}>
      {icon}
      <span style={{ fontSize: '0.72rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>{label}</span>
    </div>
    <div style={{ fontSize: '24px', fontWeight: 700, color: 'white', lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{sub}</div>}
  </div>
);

// ─────────────────────────────────────────────
// LISTA DE LO QUE PUEDE MEDIR
// ─────────────────────────────────────────────

const BAND_MEASURES = [
  { icon: Footprints, color: '#38BDF8', label: 'Pasos', detail: 'Conteo diario de pasos y distancia recorrida' },
  { icon: HeartPulse, color: '#F43F5E', label: 'Frecuencia cardíaca', detail: 'Monitorización continua y en reposo (BPM)' },
  { icon: Moon, color: '#8B5CF6', label: 'Sueño', detail: 'Fases: profundo, ligero, REM y despertares' },
  { icon: Gauge, color: '#3ACDFF', label: 'SpO₂', detail: 'Saturación de oxígeno en sangre' },
  { icon: Flame, color: '#F59E0B', label: 'Calorías', detail: 'Gasto calórico diario y por entrenamiento' },
  { icon: Timer, color: '#EC4899', label: 'Minutos activos', detail: 'Tiempo activo acumulado por día' },
  { icon: Move, color: '#f97316', label: 'Estrés', detail: 'Nivel de estrés (1–100) y pausas de respiración' },
  { icon: Award, color: '#a78bfa', label: 'PAI', detail: 'Índice personal de actividad (objetivo ≥ 100)' },
  { icon: Zap, color: '#34d399', label: 'Energía', detail: 'Estado de energía corporal (1–100)' },
  { icon: Dumbbell, color: '#f472b6', label: 'Entrenamientos', detail: '11 modos de ejercicio con ritmo cardíaco' },
  { icon: Battery, color: '#fbbf24', label: 'Batería', detail: 'Estado de carga de la pulsera' },
];

// ─────────────────────────────────────────────
// GRÁFICA DE PASOS SEMANALES
// ─────────────────────────────────────────────

const StepsWeekCanvas: React.FC<{ days: BandDayData[] }> = ({ days }) => {
  const max = Math.max(...days.map(d => d.steps), 1);
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Footprints size={16} color="#60BDF8" /> Pasos · últimos 7 días
      </h3>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px' }}>
        {days.map((d, i) => (
          <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-subtle)' }}>{Math.round(d.steps / 1000)}k</span>
            <div style={{
              width: '100%', borderRadius: '6px 6px 0 0',
              height: `${Math.max(8, (d.steps / max) * 100)}px`,
              background: i === days.length - 1 ? 'var(--accent-green)' : 'rgba(56,189,248,0.5)',
              transition: 'height 0.3s'
            }} />
            <span style={{ fontSize: '0.62rem', color: 'var(--text-subtle)' }}>{new Date(d.date + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short' })}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MÓDULO PRINCIPAL
// ─────────────────────────────────────────────

export const BandModule: React.FC = () => {
  const {
    days, dataSource, getDay, connected, battery, lastSyncAt, setConnected, syncNow,
    updateMetrics, addWorkout, removeWorkout,
    alarms, addAlarm, updateAlarm, removeAlarm,
    settings, updateSettings,
  } = useBand();
  const today = getDay(localTodayISO()) ?? days[days.length - 1];
  const [tab, setTab] = useState<BandTab>('today');
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<{ steps: string; heartRate: string; spo2: string }>({ steps: '', heartRate: '', spo2: '' });
  const [addingWorkout, setAddingWorkout] = useState(false);
  const [wo, setWo] = useState<{ mode: WorkoutMode; durationMin: string; calories: string; distanceKm: string }>({ mode: 'running', durationMin: '', calories: '', distanceKm: '' });

  if (!today) return null;

  const totalSleep = sleepTotal(today.sleep);

  const toDashboard = (view: string = 'dashboard') => {
    window.dispatchEvent(new CustomEvent('change-view', { detail: view }));
  };

  const handleManualSave = () => {
    const patch: Partial<Omit<BandDayData, 'date' | 'workouts'>> = {};
    if (values.steps !== '') patch.steps = parseInt(values.steps, 10) || 0;
    if (values.heartRate !== '') patch.heartRate = { ...today.heartRate, avg: parseInt(values.heartRate, 10) || 80 };
    if (values.spo2 !== '') patch.spo2 = parseInt(values.spo2, 10) || 96;
    updateMetrics(today.date, patch);
    setEditing(false);
    setValues({ steps: '', heartRate: '', spo2: '' });
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '8px',
    background: active ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.04)',
    border: active ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(255,255,255,0.08)',
    color: active ? '#16F0B5' : 'rgba(255,255,255,0.75)',
    borderRadius: '10px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
  });

  return (
    <div className="module-container fade-in" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Watch size={28} color="#16F0B5" /> Mi Band 5
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0 0' }}>
            Pulsera de actividad · {connected ? 'Conectada' : 'Desconectada'} · Batería {battery}%
          </p>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
            padding: '4px 10px', borderRadius: '999px',
            color: dataSource === 'imported' ? '#16F0B5' : 'var(--text-subtle)',
            background: dataSource === 'imported' ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${dataSource === 'imported' ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}`,
          }}>
            <Database size={12} /> {dataSource === 'imported' ? 'Datos reales' : 'Datos simulados'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => toDashboard()} style={btnGhost}><ArrowLeft size={14} style={{ width: 14 }} /> Dashboard</button>
          <button onClick={() => setConnected(!connected)} style={btnGhost}>
            <Bluetooth size={14} /> {connected ? 'Desvincular' : 'Conectar'}
          </button>
          <button onClick={syncNow} style={btnPrimary}><RefreshCw size={14} /> Sincronizar ahora</button>
        </div>
      </div>
      {/* TABS */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => setTab('today')} style={tabStyle(tab === 'today')}><Watch size={15} /> Hoy</button>
        <button onClick={() => setTab('history')} style={tabStyle(tab === 'history')}><CalendarDays size={15} /> Historial</button>
        <button onClick={() => setTab('alarms')} style={tabStyle(tab === 'alarms')}><Bell size={15} /> Alarmas</button>
        <button onClick={() => setTab('settings')} style={tabStyle(tab === 'settings')}><SettingsIcon size={15} /> Ajustes</button>
        <button onClick={() => setTab('import')} style={tabStyle(tab === 'import')}><Upload size={15} /> Importar datos</button>
      </div>

      {tab === 'history' && <BandHistory days={days} settings={settings} />}
      {tab === 'alarms' && <BandAlarms alarms={alarms} addAlarm={addAlarm} updateAlarm={updateAlarm} removeAlarm={removeAlarm} />}
      {tab === 'settings' && <BandSettingsPanel settings={settings} updateSettings={updateSettings} />}
      {tab === 'import' && <BandImport />}

      {tab === 'today' && (<>
        {/* BANDA DE CONEXIÓN */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-subtle)' }}>
          <Battery size={16} color="#34d399" /> {battery}%
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Última sincronización: {fmtTime(lastSyncAt)}</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: connected ? 'var(--accent-green)' : '#F87171' }}>
          <Bluetooth size={13} /> {connected ? 'Vinculada vía Bluetooth (simulada)' : 'Sin conexión'}
        </span>
      </div>

      {/* ACCIONES: EDITAR MÉTRICAS */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => setEditing(v => !v)} style={editing ? btnPrimary : btnGhost}>
          <Plus size={14} /> {editing ? 'Cerrar edición' : 'Editar métricas de hoy'}
        </button>
      </div>

      {/* PANEL DE EDICIÓN MANUAL */}
      {editing && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Footprints size={15} color="#60BDF8" /> Actualizar medidas de hoy
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            <label style={fieldLabel}>Pasos
              <input style={fieldInput} type="number" placeholder={String(today.steps)} onChange={e => setValues(v => ({ ...v, steps: e.target.value }))} />
            </label>
            <label style={fieldLabel}>BPM cardíaco
              <input style={fieldInput} type="number" placeholder={String(today.heartRate.avg)} onChange={e => setValues(v => ({ ...v, heartRate: e.target.value }))} />
            </label>
            <label style={fieldLabel}>SpO₂ (%)
              <input style={fieldInput} type="number" placeholder={String(today.spo2 ?? '')} onChange={e => setValues(v => ({ ...v, spo2: e.target.value }))} />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={handleManualSave} style={btnPrimary}>Guardar medidas</button>
          </div>
        </div>
      )}

      {/* MÉTRICAS DEL DÍA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
        <MetricCard icon={<Footprints size={16} />} color="#60BDF8" label="Pasos" value={today.steps.toLocaleString('es-CL')} sub={`${today.distanceKm.toLocaleString('es-CL', { maximumFractionDigits: 1 })} km`} />
        <MetricCard icon={<Timer size={16} />} color="#EC4899" label="Minutos activos" value={`${today.activeMinutes} min`} />
        <MetricCard icon={<Flame size={16} />} color="#F59E0B" label="Calorías activas" value={today.calories.toLocaleString('es-CL')} />
        <MetricCard icon={<HeartPulse size={16} />} color="#F43F5E" label="Frec. cardíaca" value={`${today.heartRate.avg} bpm`} sub={`reposo ${today.heartRate.resting} · máx ${today.heartRate.max}`} />
        <MetricCard icon={<Gauge size={16} />} color="#10B981" label="SpO₂" value={`${today.spo2 ?? '—'}%`} />
        <MetricCard icon={<Move size={16} />} color="#3ACDFF" label="Estrés" value={today.stress !== null ? `${today.stress} / 100` : '—'} />
        <MetricCard icon={<Award size={16} />} color="#a78bfa" label="PAI" value={`${today.pai}`} sub="objetivo ≥ 100" />
        <MetricCard icon={<Battery size={16} />} color="#fbbf24" label="Energía" value={`${today.energy ?? '—'} / 100`} />
      </div>

      {/* SUEÑO */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        <div>
          <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Moon size={16} color="#8B5CF6" /> Sueño de anoche
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <SleepBar label="Profundo" min={today.sleep.deepMin} color="#8B5CF6" total={totalSleep} />
            <SleepBar label="Ligero" min={today.sleep.lightMin} color="#3B82F6" total={totalSleep} />
            <SleepBar label="REM" min={today.sleep.remMin} color="#38BDF8" total={totalSleep} />
            <SleepBar label="Despierto" min={today.sleep.awakeMin} color="#64748B" total={totalSleep} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px', paddingLeft: '12px', borderLeft: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'white' }}>{fmtDuration(totalSleep)}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-subtle)' }}>Total de sueño</div>
          <div style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
            Profundo <b style={{ color: '#8B5CF6' }}>{today.sleep.deepMin} min</b> · REM <b style={{ color: '#38BDF8' }}>{today.sleep.remMin} min</b>
          </div>
        </div>
      </div>

      {/* ENTRENAMIENTOS */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Dumbbell size={16} color="#f472b6" /> Entrenamientos de hoy
          </h3>
          <button onClick={() => setAddingWorkout(v => !v)} style={btnGhost}><Plus size={14} /> {addingWorkout ? 'Cerrar' : 'Registrar'}</button>
        </div>
        {addingWorkout && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
            <select value={wo.mode} onChange={e => setWo(w => ({ ...w, mode: e.target.value as WorkoutMode }))} style={fieldInput}>
              {(Object.keys(WORKOUT_MODE_LABELS) as WorkoutMode[]).map(m => <option key={m} value={m}>{WORKOUT_MODE_LABELS[m]}</option>)}
            </select>
            <input style={fieldInput} type="number" placeholder="Duración (min)" onChange={e => setWo(w => ({ ...w, durationMin: e.target.value }))} />
            <input style={fieldInput} type="number" placeholder="Calorías" onChange={e => setWo(w => ({ ...w, calories: e.target.value }))} />
            <input style={fieldInput} type="number" step="0.01" placeholder="Distancia (km)" onChange={e => setWo(w => ({ ...w, distanceKm: e.target.value }))} />
            <button onClick={() => {
              if (!wo.durationMin) return;
              addWorkout(today.date, {
                mode: wo.mode,
                durationMin: parseInt(wo.durationMin, 10) || 0,
                calories: parseInt(wo.calories, 10) || 0,
                distanceKm: parseFloat(wo.distanceKm) || 0,
                heartRateAvg: today.heartRate.avg,
                heartRateMax: today.heartRate.max,
              });
              setWo({ mode: 'running', durationMin: '', calories: '', distanceKm: '' });
              setAddingWorkout(false);
            }} style={btnPrimary}>Agregar</button>
          </div>
        )}
        {(today.workouts ?? []).length === 0 ? (
          <p style={{ color: 'var(--text-subtle)', fontSize: '13px' }}>Sin entrenamientos registrados hoy.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {today.workouts.map(w => <WorkoutRow key={w.id} w={w} date={today.date} onRemove={removeWorkout} />)}
          </div>
        )}
      </div>

      {/* TREND SEMANAL */}
      <StepsWeekCanvas days={days.slice(-7)} />

      {/* ACCIONES A FUTURO */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => toDashboard('health')} style={{ ...btnGhost, borderColor: 'var(--accent-green)' }}>
          Combinar con Salud <ArrowRight size={14} />
        </button>
      </div>

      {/* QUÉ MIDE LA BAND */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Watch size={16} color="#34d399" /> ¿Qué puede medir tu Mi Band 5?
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {BAND_MEASURES.map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <m.icon size={15} color={m.color} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: '0.82rem', color: 'white', fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '2px' }}>{m.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '14px' }}>
          {dataSource === 'imported'
            ? 'Los datos de hoy provienen de tu respaldo real importado en la pestaña "Importar datos".'
            : 'Los datos se capturan de forma simulada en esta versión web (la Mi Band 5 no expone Bluetooth abierto al navegador). Importa tu respaldo real desde la pestaña "Importar datos" (Gadgetbridge / Mi Fitness / CSV).'}
        </p>
      </div>
      </>)}
    </div>
  );
};

// ─────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────

const SleepBar: React.FC<{ label: string; min: number; color: string; total: number }> = ({ label, min, color, total }) => {
  const pct = Math.round((min / total) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ width: '72px', fontSize: '0.72rem', color: 'var(--text-subtle)' }}>{label}</span>
      <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.3s' }} />
      </div>
      <span style={{ width: '54px', textAlign: 'right', fontSize: '0.72rem', color: 'white', fontVariantNumeric: 'tabular-nums' }}>
        {fmtDuration(min)}
      </span>
    </div>
  );
};

const WorkoutRow: React.FC<{ w: Workout; date: string; onRemove: (date: string, id: string) => void }> = ({ w, date, onRemove }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
      <span style={{ fontSize: '13px', color: 'white', flex: 1 }}>
        {WORKOUT_MODE_LABELS[w.mode]}
        <span style={{ color: 'var(--text-subtle)', fontSize: '12px', marginLeft: '8px' }}>
          {w.durationMin} min · {w.calories} kcal{w.distanceKm > 0 ? ` · ${w.distanceKm.toLocaleString('es-CL', { maximumFractionDigits: 1 })} km` : ''} · {w.heartRateAvg} bpm
        </span>
      </span>
      <button onClick={() => onRemove(date, w.id)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}>
        <Trash2 size={14} />
      </button>
    </div>
  );
};

export default BandModule;