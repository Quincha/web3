import React from 'react';
import {
  Hand, Clock, BellRing, Moon, HeartPulse, Smartphone, Battery,
  Ruler, Vibrate, Footprints
} from 'lucide-react';
import type { BandSettings } from '../../context/BandContext';

// ─────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────

const sectionCard: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px'
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
  borderRadius: '8px', padding: '8px 10px', color: 'white', fontSize: '14px', fontFamily: 'inherit', width: '100%'
};

const SettingRow: React.FC<{ icon: React.ReactNode; title: string; desc?: string; children: React.ReactNode }> = ({ icon, title, desc, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <span style={{ color: 'var(--text-subtle)', flexShrink: 0 }}>{icon}</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '0.88rem', color: 'white', fontWeight: 600 }}>{title}</div>
      {desc && <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '2px' }}>{desc}</div>}
    </div>
    <div style={{ flexShrink: 0 }}>{children}</div>
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
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
);

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────

export const BandSettingsPanel: React.FC<{
  settings: BandSettings;
  updateSettings: (patch: Partial<BandSettings>) => void;
}> = ({ settings, updateSettings }) => {
  const set = <K extends keyof BandSettings>(k: K, v: BandSettings[K]) => updateSettings({ [k]: v });

  const chip = (active: boolean): React.CSSProperties => ({
    background: active ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
    border: active ? '1px solid rgba(52,211,153,0.35)' : '1px solid rgba(255,255,255,0.08)',
    color: active ? '#16F0B5' : 'rgba(255,255,255,0.7)',
    borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Muñeca y pantalla */}
      <div style={sectionCard}>
        <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Hand size={16} color="#60bdf8" /> Muñeca y pantalla
        </h3>
        <SettingRow icon={<Hand size={16} />} title="Muñeca de uso" desc="Dónde llevas puesta la pulsera">
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={chip(settings.wristSide === 'left')} onClick={() => set('wristSide', 'left')}>Izquierda</button>
            <button style={chip(settings.wristSide === 'right')} onClick={() => set('wristSide', 'right')}>Derecha</button>
          </div>
        </SettingRow>
        <SettingRow icon={<BellRing size={16} />} title="Pantalla al levantar la muñeca" desc="Se enciende al girar la muñeca hacia ti">
          <Toggle checked={settings.raiseToWake} onChange={v => set('raiseToWake', v)} />
        </SettingRow>
        <SettingRow icon={<Clock size={16} />} title="Duración de pantalla encendida">
          <select style={inputStyle} value={settings.screenTimeout} onChange={e => set('screenTimeout', Number(e.target.value))}>
            <option value={3}>3 segundos</option>
            <option value={5}>5 segundos</option>
            <option value={10}>10 segundos</option>
            <option value={15}>15 segundos</option>
          </select>
        </SettingRow>
        <SettingRow icon={<Clock size={16} />} title="Formato de hora">
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={chip(settings.timeFormat === '24')} onClick={() => set('timeFormat', '24')}>24h</button>
            <button style={chip(settings.timeFormat === '12')} onClick={() => set('timeFormat', '12')}>12h</button>
          </div>
        </SettingRow>
        <SettingRow icon={<Ruler size={16} />} title="Unidad de distancia">
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={chip(settings.distanceUnit === 'metric')} onClick={() => set('distanceUnit', 'metric')}>Km</button>
            <button style={chip(settings.distanceUnit === 'imperial')} onClick={() => set('distanceUnit', 'imperial')}>Mi</button>
          </div>
        </SettingRow>
      </div>

      {/* Meta diaria */}
      <div style={sectionCard}>
        <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Footprints size={16} color="#38BDF8" /> Meta diaria
        </h3>
        <SettingRow icon={<Footprints size={16} />} title="Objetivo de pasos diario" desc="Se usa en el dashboard y el historial">
          <div style={{ width: '180px' }}>
            <input
              type="range" min="4000" max="20000" step="500"
              value={settings.goalSteps}
              onChange={e => set('goalSteps', Number(e.target.value))}
              style={{ width: '100%', accentColor: '#16F0B5' }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', textAlign: 'center', marginTop: '2px' }}>
              {settings.goalSteps.toLocaleString('es-CL')} pasos
            </div>
          </div>
        </SettingRow>
      </div>

      {/* Monitorización */}
      <div style={sectionCard}>
        <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HeartPulse size={16} color="#F43F5E" /> Monitorización
        </h3>
        <SettingRow icon={<HeartPulse size={16} />} title="Frecuencia cardíaca automática" desc="Cada cuánto mide tu pulso durante el día">
          <select style={inputStyle} value={settings.hrMonitorInterval} onChange={e => set('hrMonitorInterval', Number(e.target.value))}>
            <option value={0}>Desactivado</option>
            <option value={1}>Cada 1 min (intensivo)</option>
            <option value={5}>Cada 5 min</option>
            <option value={30}>Cada 30 min</option>
          </select>
        </SettingRow>
        <SettingRow icon={<BellRing size={16} />} title="Alertas de frecuencia cardíaca alta" desc="Avisa durante el ejercicio si pasas tu FC máxima">
          <Toggle checked={settings.heartAlerts} onChange={v => set('heartAlerts', v)} />
        </SettingRow>
        <SettingRow icon={<Moon size={16} />} title="Detección automática de sueño" desc="Analiza fases (profundo, ligero, REM)">
          <Toggle checked={settings.autoSleepTracking} onChange={v => set('autoSleepTracking', v)} />
        </SettingRow>
      </div>

      {/* Notificaciones */}
      <div style={sectionCard}>
        <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Smartphone size={18} color="#34d399" /> Notificaciones
        </h3>
        <SettingRow icon={<Smartphone size={16} />} title="Notificaciones del teléfono en la pulsera" desc="WhatsApp, llamadas, SMS, correos...">
          <Toggle checked={settings.autoNotifications} onChange={v => set('autoNotifications', v)} />
        </SettingRow>
        <SettingRow icon={<Battery size={16} />} title="Alerta de batería baja" desc="Aviso cuando la pulsera baja del 20%">
          <Toggle checked={settings.batteryNotify} onChange={v => set('batteryNotify', v)} />
        </SettingRow>
      </div>

      {/* No molestar */}
      <div style={sectionCard}>
        <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Moon size={18} color="#F87171" /> No molestar
        </h3>
        <SettingRow icon={<Moon size={16} />} title="Activar modo No molestar" desc="Bloquea notificaciones y vibraciones en un horario">
          <Toggle checked={settings.dndEnabled} onChange={v => set('dndEnabled', v)} />
        </SettingRow>
        {settings.dndEnabled && (
          <SettingRow icon={<Clock size={16} />} title="Horario (inicio → fin)">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="time" value={settings.dndStart} onChange={e => set('dndStart', e.target.value)} style={inputStyle} />
              <span style={{ color: 'var(--text-subtle)' }}>→</span>
              <input type="time" value={settings.dndEnd} onChange={e => set('dndEnd', e.target.value)} style={inputStyle} />
            </div>
          </SettingRow>
        )}
      </div>

      {/* Vibración */}
      <div style={sectionCard}>
        <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Vibrate size={18} color="#fbbf24" /> Vibración
        </h3>
        <SettingRow icon={<BellRing size={16} />} title="Intensidad de vibración" desc="Fuerza del motor de vibración">
          <input
            type="range" min="1" max="5" step="1"
            value={settings.vibStrength}
            onChange={e => set('vibStrength', Number(e.target.value))}
            style={{ width: '100%', accentColor: '#fbbf24' }}
          />
        </SettingRow>
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 0 }}>
        Configuración simulada para esta versión web. Al conectar con el backend real (app Xiaomi Mi Fitness) estos valores se sincronizarán con la pulsera por Bluetooth.
      </p>
    </div>
  );
};

export default BandSettingsPanel;