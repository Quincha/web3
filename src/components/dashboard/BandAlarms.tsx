import React, { useState } from 'react';
import {
  Bell, BellOff, BellRing, Plus, Trash2, Moon, Clock
} from 'lucide-react';
import type { BandAlarm } from '../../context/BandContext';
import { DAY_SHORT } from '../../context/BandContext';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function parseHM(time: string): { h: number; m: number } {
  const [h, m] = time.split(':').map(Number);
  return { h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m };
}

function fmt12(time: string): string {
  const { h, m } = parseHM(time);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${suffix}`;
}

function repeatLabel(days: number[]): string {
  if (days.length === 0) return 'Una sola vez';
  if (days.length === 7) return 'Todos los días';
  if (days.length === 5 && days.every(d => [0, 1, 2, 3, 4].includes(d))) return 'De lunes a viernes';
  return days.map(d => DAY_SHORT[d]).join(' ');
}

// ─────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  background: 'var(--accent-green)', color: '#0C1117', border: 'none',
  borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: '6px'
};

const btnGhost: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: '6px'
};

const inputLabel: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem',
  color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em'
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
  borderRadius: '8px', padding: '8px 10px', color: 'white', fontSize: '14px', fontFamily: 'inherit', width: '100%'
};

// ─────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────

const DayPickerRow: React.FC<{ repeatDays: number[]; toggleDay: (d: number) => void }> = ({ repeatDays, toggleDay }) => (
  <div style={{ display: 'flex', gap: '6px' }}>
    {DAY_SHORT.map((day, d) => {
      const active = repeatDays.includes(d);
      return (
        <button
          key={d}
          type="button"
          onClick={() => toggleDay(d)}
          style={{
            width: '38px', height: '38px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            background: active ? 'var(--accent-green)' : 'rgba(255,255,255,0.06)',
            border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.12)',
            color: active ? '#0C1117' : 'rgba(255,255,255,0.6)'
          }}
        >{day}</button>
      );
    })}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: React.ReactNode }> = ({ checked, onChange, label }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'white', cursor: 'pointer' }}>
    {label !== undefined && <span style={{ flex: 1 }}>{label}</span>}
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', padding: 0, position: 'relative',
        background: checked ? 'var(--accent-green)' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s'
      }}
    >
      <span style={{
        position: 'absolute', top: '3px', left: checked ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%',
        background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
      }} />
    </button>
  </label>
);

// ─────────────────────────────────────────────
// COMPONENTE ALARMAS
// ─────────────────────────────────────────────

export const BandAlarms: React.FC<{
  alarms: BandAlarm[];
  addAlarm: (a: Omit<BandAlarm, 'id'>) => void;
  updateAlarm: (id: string, patch: Partial<BandAlarm>) => void;
  removeAlarm: (id: string) => void;
}> = ({ alarms, addAlarm, updateAlarm, removeAlarm }) => {
  const [adding, setAdding] = useState(false);
  const [time, setTime] = useState('07:00');
  const [label, setLabel] = useState('');
  const [repeatDays, setRepeatDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [smartWake, setSmartWake] = useState(true);
  const [snooze, setSnooze] = useState(true);

  const toggleDay = (d: number) => {
    setRepeatDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const handleAdd = () => {
    if (!time) return;
    addAlarm({ time, label: label.trim() || `Alarma · ${fmt12(time)}`, repeatDays, enabled: true, smartWake, snooze });
    setAdding(false);
    setLabel('');
    setTime('08:00');
    setRepeatDays([0, 1, 2, 3, 4]);
  };

  const sorted = [...alarms].sort((a, b) => a.time.localeCompare(b.time));
  const enabledCount = alarms.filter(a => a.enabled).length;

  const nextAlarm = sorted
    .filter(a => a.enabled)
    .sort((a, b) => {
      const now = new Date();
      const at = (t: string) => {
        const d = new Date();
        d.setHours(parseHM(t).h, parseHM(t).m, 0, 0);
        return d.getTime() >= now.getTime() ? d.getTime() : d.getTime() + 86400000;
      };
      return at(a.time) - at(b.time);
    })[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-subtle)' }}>Próxima alarma</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--accent-green)', marginTop: '4px' }}>
            {nextAlarm ? fmt12(nextAlarm.time) : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '2px' }}>
            {nextAlarm ? nextAlarm.label : 'Sin alarmas activas'}
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-subtle)' }}>Alarmas activas</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'white', marginTop: '4px' }}>
            {enabledCount}<span style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>/{alarms.length}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '2px' }}>Máx. 8 nativas en la Mi Band 5</div>
        </div>
      </div>

      {/* Lista + agregar */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={16} color="#60bdf8" /> Alarmas y recordatorios
          </h3>
          {alarms.length < 8 && (
            <button onClick={() => setAdding(v => !v)} style={btnGhost}>
              <Plus size={14} /> {adding ? 'Cancelar' : 'Nueva alarma'}
            </button>
          )}
        </div>

        {adding && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              <label style={inputLabel}>Hora
                <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
              </label>
              <label style={inputLabel}>Etiqueta (opcional)
                <input
                  type="text"
                  placeholder="Ej: Despertar, Medicamento..."
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Repetir</span>
              <DayPickerRow repeatDays={repeatDays} toggleDay={toggleDay} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Toggle checked={smartWake} onChange={setSmartWake} label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Moon size={15} color="#8B5CF6" /> Alarma inteligente (vibra antes de sonar)</span>} />
              <Toggle checked={snooze} onChange={setSnooze} label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><BellRing size={15} color="#F59E0B" /> Poder posponer (snooze)</span>} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setAdding(false)} style={btnGhost}>Cancelar</button>
              <button onClick={handleAdd} style={btnPrimary}>Guardar alarma</button>
            </div>
          </div>
        )}

        {sorted.length === 0 && (
          <p style={{ color: 'var(--text-subtle)', fontSize: '13px' }}>Aún no tienes alarmas. ¡Crea una!</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sorted.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '21px', fontWeight: 700, color: a.enabled ? 'white' : '#475569', width: '86px', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} style={{ color: a.enabled ? '#16F0B5' : '#475569' }} /> {fmt12(a.time)}
              </span>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: '0.9rem', color: a.enabled ? 'white' : 'var(--text-subtle)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {a.enabled ? <BellRing size={13} color="#16F0B5" /> : <BellOff size={13} />} {a.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>{repeatLabel(a.repeatDays)}</span>
                  {a.smartWake && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Moon size={11} color="#8B5CF6" /> inteligente</span>}
                  {a.snooze && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><BellRing size={11} color="#F59E0B" /> snooze</span>}
                </div>
              </div>
              <Toggle checked={a.enabled} onChange={v => updateAlarm(a.id, { enabled: v })} />
              <button onClick={() => removeAlarm(a.id)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Nota estilo Notify */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={16} color="#34d399" /> Como en Notify for Mi Band
        </h3>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-subtle)', lineHeight: 1.6 }}>
          La Mi Band 5 soporta hasta <b style={{ color: 'white' }}>8 alarmas nativas</b> sincronizadas con la pulsera (vibran aunque el teléfono esté en silencio).
          Además puedes crear recordatorios ilimitados (tomar agua, medicamento, pausas). Las alarmas inteligentes vibran suavemente antes de la hora en la fase de sueño más ligera.
        </p>
      </div>
    </div>
  );
};

export default BandAlarms;