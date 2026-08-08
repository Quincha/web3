import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Settings, Target, Lightbulb, CheckCircle2, Sun, X, Volume2, VolumeX, Clock, Check, ExternalLink } from 'lucide-react';
import { usePomodoro } from '../context/PomodoroContext';
import { WidgetRegistry } from './WidgetRegistry';

const PRO_TIPS = [
  'Mantén el enfoque. El progreso está en la constancia, no en la perfección.',
  'Elimina las distracciones externas antes de arrancar los 25 minutos.',
  'Haz una pausa activa en el descanso: camina, bebe agua y estírate.',
  'Al terminar cada Pomodoro, registra tus notas en el Bullet Journal.'
];

const PomodoroWidget: React.FC = () => {
  const { 
    timeRemaining, 
    totalDuration, 
    isActive, 
    isPaused,
    task: currentTaskTitle,
    completedSessions,
    startSession, 
    pauseSession,
    resumeSession,
    cancelSession,
    finishSession
  } = usePomodoro();

  const [tipIndex] = useState(0);

  // Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [workMinutes, setWorkMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [targetSessions, setTargetSessions] = useState<number>(8); // Default 8, min 4, max 20
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);

  // Compute today's statistics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayWorkSessions = (completedSessions || []).filter(
    s => s.type === 'work' && s.timestamp.startsWith(todayStr)
  );
  const todaySessionCount = todayWorkSessions.length;
  const todayTotalMinutes = todayWorkSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    if (totalDuration === 0) return 0;
    return ((totalDuration - timeRemaining) / totalDuration) * 100;
  };

  const pct = getProgressPercentage();
  const radius = 68;
  const circumference = 2 * Math.PI * radius; // ~427.25
  const strokeDashoffset = circumference - (circumference * pct) / 100;

  // Handle dot position at tip of arc
  const angle = (pct / 100) * 360 - 90;
  const dotX = 90 + radius * Math.cos((angle * Math.PI) / 180);
  const dotY = 90 + radius * Math.sin((angle * Math.PI) / 180);

  const handleStart = () => {
    startSession('work', 'General', 'Enfoque profundo', workMinutes);
  };

  const handleSaveSettings = () => {
    setShowSettingsModal(false);
    if (!isActive) {
      startSession('work', 'General', 'Enfoque profundo', workMinutes);
    }
  };

  return (
    <div className="dashboard-card" style={{ 
      background: '#0B0F19', 
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '20px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      color: '#fff',
      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)'
    }}>
      
      {/* ── Settings Modal Overlay ────────────────────────────── */}
      {showSettingsModal && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(11, 15, 25, 0.96)',
          backdropFilter: 'blur(16px)',
          zIndex: 50,
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflowY: 'auto'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} color="#00E5D9" />
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Ajustes del Pomodoro</span>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Duraciones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#00E5D9', fontWeight: 700, letterSpacing: '0.05em' }}>
                  DURACIÓN DE ENFOQUE (MINUTOS):
                </label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {[15, 25, 30, 45, 60].map(m => (
                    <button
                      key={m}
                      onClick={() => setWorkMinutes(m)}
                      style={{
                        flex: 1,
                        background: workMinutes === m ? 'rgba(0, 229, 217, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${workMinutes === m ? '#00E5D9' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '8px',
                        padding: '6px',
                        color: workMinutes === m ? '#00E5D9' : 'rgba(255, 255, 255, 0.7)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 700, letterSpacing: '0.05em' }}>
                  DESCANSO CORTO:
                </label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {[3, 5, 10, 15].map(m => (
                    <button
                      key={m}
                      onClick={() => setShortBreakMinutes(m)}
                      style={{
                        flex: 1,
                        background: shortBreakMinutes === m ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${shortBreakMinutes === m ? '#38BDF8' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '8px',
                        padding: '6px',
                        color: shortBreakMinutes === m ? '#38BDF8' : 'rgba(255, 255, 255, 0.7)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#A78BFA', fontWeight: 700, letterSpacing: '0.05em' }}>
                  DESCANSO LARGO:
                </label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {[15, 20, 25, 30].map(m => (
                    <button
                      key={m}
                      onClick={() => setLongBreakMinutes(m)}
                      style={{
                        flex: 1,
                        background: longBreakMinutes === m ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${longBreakMinutes === m ? '#A78BFA' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '8px',
                        padding: '6px',
                        color: longBreakMinutes === m ? '#A78BFA' : 'rgba(255, 255, 255, 0.7)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              {/* 3-Column Row: Sesiones, Sonido, Auto-inicio */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px', marginTop: '2px' }}>
                
                {/* Col 1: Objetivo Sesiones */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#FBBF24', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>
                    OBJETIVO SESIONES
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                      onClick={() => setTargetSessions(prev => Math.max(4, prev - 1))}
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '6px',
                        width: '24px',
                        height: '24px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Disminuir (Min 4)"
                    >
                      -
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#FBBF24' }}>
                      {targetSessions} <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>hoy</span>
                    </span>
                    <button
                      onClick={() => setTargetSessions(prev => Math.min(20, prev + 1))}
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '6px',
                        width: '24px',
                        height: '24px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Aumentar (Max 20)"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Col 2: Sonido Alarma */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#10B981', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>
                    SONIDO ALARMA
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {soundEnabled ? <Volume2 size={14} color="#10B981" /> : <VolumeX size={14} color="rgba(255,255,255,0.4)" />}
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Activo</span>
                    </div>
                    <button 
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      style={{ background: soundEnabled ? '#10B981' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', padding: '2px 8px', color: soundEnabled ? '#000' : '#fff', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      {soundEnabled ? 'SI' : 'NO'}
                    </button>
                  </div>
                </div>

                {/* Col 3: Auto-inicio */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#38BDF8', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>
                    AUTO-DESCANSO
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={14} color="#38BDF8" />
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Auto</span>
                    </div>
                    <button 
                      onClick={() => setAutoStartBreaks(!autoStartBreaks)}
                      style={{ background: autoStartBreaks ? '#38BDF8' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', padding: '2px 8px', color: autoStartBreaks ? '#000' : '#fff', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      {autoStartBreaks ? 'SI' : 'NO'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            style={{
              background: 'linear-gradient(135deg, #00E5D9 0%, #0284C7 100%)',
              border: 'none',
              borderRadius: '10px',
              padding: '10px',
              color: '#0B0F19',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(0, 229, 217, 0.4)'
            }}
          >
            <Check size={16} />
            <span>Guardar y Aplicar</span>
          </button>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
          Pomodoro
        </h3>
        <button 
          onClick={() => { window.dispatchEvent(new CustomEvent('change-view', { detail: 'pomodoro' })); window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: 'pomodoro' })); }}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
          title="Abrir el módulo completo de Pomodoro"
        >
          <ExternalLink size={13} /> Módulo completo
        </button>
        <button 
          onClick={() => setShowSettingsModal(true)}
          style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}
          title="Ajustar tiempos y configuración de Pomodoro"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* ── Main Body (Left Dial + Right Details) ──────────────── */}
      <div style={{ display: 'flex', gap: '28px', alignItems: 'center', flex: 1, marginBottom: '20px' }}>
        
        {/* Left Side: High-Tech Dial Timer */}
        <div style={{ position: 'relative', width: '180px', height: '180px', flexShrink: 0 }}>
          
          <svg width="180" height="180" viewBox="0 0 180 180">
            {/* Outer perimeter tick marks (60 ticks) */}
            {Array.from({ length: 60 }).map((_, i) => {
              const tickAngle = (i * 6 * Math.PI) / 180;
              const innerR = i % 5 === 0 ? 82 : 84;
              const outerR = 87;
              const x1 = 90 + innerR * Math.cos(tickAngle);
              const y1 = 90 + innerR * Math.sin(tickAngle);
              const x2 = 90 + outerR * Math.cos(tickAngle);
              const y2 = 90 + outerR * Math.sin(tickAngle);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={i % 5 === 0 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.08)'}
                  strokeWidth={i % 5 === 0 ? 1.5 : 1}
                />
              );
            })}

            {/* Inner background track */}
            <circle 
              cx="90" 
              cy="90" 
              r={radius}
              fill="none" 
              stroke="rgba(15, 23, 42, 0.8)"
              strokeWidth="10" 
            />
            <circle 
              cx="90" 
              cy="90" 
              r={radius}
              fill="none" 
              stroke="rgba(56, 189, 248, 0.12)"
              strokeWidth="6" 
            />

            {/* Active Cyan Arc */}
            <circle 
              cx="90" 
              cy="90" 
              r={radius}
              fill="none" 
              stroke="#00E5D9"
              strokeWidth="6" 
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 90 90)"
              style={{ 
                transition: 'stroke-dashoffset 1s linear', 
                filter: 'drop-shadow(0 0 10px rgba(0, 229, 217, 0.7))' 
              }}
            />

            {/* Tip Dot Handle on arc */}
            {pct > 0 && (
              <circle
                cx={dotX}
                cy={dotY}
                r="4"
                fill="#FFFFFF"
                style={{ filter: 'drop-shadow(0 0 6px #00E5D9)' }}
              />
            )}
          </svg>

          {/* Center Inner Overlay Text */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}>
            <span style={{ fontSize: '10px', color: '#00E5D9', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '2px', textTransform: 'uppercase' }}>
              ENFOQUE
            </span>
            <span className="outfit" style={{ 
              fontSize: '34px', 
              fontWeight: 700, 
              color: '#FFFFFF', 
              lineHeight: 1,
              letterSpacing: '-0.02em',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))'
            }}>
              {formatTime(timeRemaining)}
            </span>
            {/* Center Rays Icon */}
            <div style={{ margin: '4px 0 2px 0', opacity: 0.85 }}>
              <Sun size={14} color="#00E5D9" />
            </div>
            <span style={{ fontSize: '10px', color: '#00E5D9', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {isActive ? (isPaused ? 'EN PAUSA' : 'ENFOCADO') : 'LISTO'}
            </span>
          </div>

        </div>

        {/* Right Side: Details, Stepper, Buttons & Pro Tip */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* SESIÓN ACTUAL Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '12px', 
              background: 'rgba(56, 189, 248, 0.08)', 
              border: '1px solid rgba(56, 189, 248, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00E5D9',
              flexShrink: 0
            }}>
              <Target size={22} />
            </div>
            <div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                SESIÓN ACTUAL
              </div>
              <div style={{ fontSize: '15px', color: '#fff', fontWeight: 700, marginTop: '1px' }}>
                {currentTaskTitle || 'Enfoque profundo'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>
                Distrae menos, crea más.
              </div>
            </div>
          </div>

          {/* LÍNEA DE SESIÓN Stepper */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              LÍNEA DE SESIÓN
            </div>

            {/* Stepper Node Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
              <span style={{ color: '#00E5D9', fontWeight: 700 }}>Pomodoro 1</span>
              <span>Descanso corto</span>
              <span>Pomodoro 2</span>
              <span>Descanso largo</span>
            </div>

            {/* Stepper Bar Track */}
            <div style={{ position: 'relative', width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', marginTop: '2px' }}>
              <div style={{ width: '25%', height: '100%', background: '#00E5D9', borderRadius: '2px', boxShadow: '0 0 8px #00E5D9' }} />
              {/* Stepper Dots */}
              <div style={{ position: 'absolute', top: '-3px', left: '23%', width: '10px', height: '10px', borderRadius: '50%', background: '#00E5D9', border: '2px solid #0B0F19' }} />
              <div style={{ position: 'absolute', top: '-3px', left: '48%', width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid #0B0F19' }} />
              <div style={{ position: 'absolute', top: '-3px', left: '73%', width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid #0B0F19' }} />
              <div style={{ position: 'absolute', top: '-3px', left: '97%', width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid #0B0F19' }} />
            </div>
          </div>

          {/* Action Buttons Row */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            {/* Primary Action: INICIAR when inactive, PAUSAR / REANUDAR when active */}
            {!isActive ? (
              <button
                onClick={handleStart}
                style={{
                  flex: 1.2,
                  background: 'linear-gradient(135deg, #00E5D9 0%, #02BBAF 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  color: '#0B0F19',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(0, 229, 217, 0.4)',
                  letterSpacing: '0.04em'
                }}
              >
                <Play size={14} fill="currentColor" />
                <span>INICIAR</span>
              </button>
            ) : (
              <button
                onClick={isPaused ? resumeSession : pauseSession}
                style={{
                  flex: 1,
                  background: isPaused ? 'linear-gradient(135deg, #00E5D9 0%, #02BBAF 100%)' : 'rgba(251, 191, 36, 0.12)',
                  border: `1px solid ${isPaused ? '#00E5D9' : 'rgba(251, 191, 36, 0.3)'}`,
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: isPaused ? '#0B0F19' : '#FBBF24',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: isPaused ? '0 4px 14px rgba(0, 229, 217, 0.4)' : 'none',
                  letterSpacing: '0.04em'
                }}
              >
                {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                <span>{isPaused ? 'REANUDAR' : 'PAUSAR'}</span>
              </button>
            )}

            {/* Secondary Action: PARAR / FINALIZAR (Only when active) */}
            {isActive && (
              <button
                onClick={finishSession}
                style={{
                  flex: 1,
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#10B981',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  letterSpacing: '0.04em'
                }}
                title="Finalizar sesión antes de tiempo y guardar"
              >
                <Check size={14} />
                <span>PARAR</span>
              </button>
            )}

            {/* Reset / Cancel Action */}
            <button
              onClick={cancelSession}
              style={{
                flex: isActive ? 0.8 : 0.8,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '10px 14px',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                letterSpacing: '0.04em'
              }}
              title="Reiniciar contador a 25:00"
            >
              <RotateCcw size={14} />
              <span>REINICIAR</span>
            </button>
          </div>

          {/* Consejo Pro Tip Box */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(56, 189, 248, 0.15)',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <Lightbulb size={16} color="#00E5D9" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.4 }}>
              <span style={{ color: '#00E5D9', fontWeight: 700 }}>Consejo: </span>
              {PRO_TIPS[tipIndex]}
            </div>
          </div>

        </div>

      </div>

      {/* ── Footer Metrics (3 Columns) ─────────────────────────── */}
      <div style={{ 
        borderTop: '1px solid rgba(255, 255, 255, 0.06)', 
        paddingTop: '14px', 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '16px'
      }}>
        
        {/* Col 1: Sesiones Hoy */}
        <div>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            SESIONES HOY
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#00E5D9', marginTop: '2px', lineHeight: 1 }}>
            {todaySessionCount}/{targetSessions}
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
            completadas
          </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap', maxWidth: '140px' }}>
            {Array.from({ length: Math.min(targetSessions, 12) }).map((_, idx) => {
              const isDone = idx < todaySessionCount;
              return (
                <div 
                  key={idx}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: isDone ? 'rgba(0, 229, 217, 0.25)' : 'transparent',
                    border: `1.5px solid ${isDone ? '#00E5D9' : 'rgba(255, 255, 255, 0.2)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={isDone ? `Sesión ${idx + 1} completada` : `Sesión ${idx + 1} pendiente`}
                >
                  {isDone && <CheckCircle2 size={8} color="#00E5D9" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 2: Tiempo Enfocado */}
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '16px' }}>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            TIEMPO ENFOCADO
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#00E5D9', marginTop: '2px', lineHeight: 1 }}>
            {Math.floor(todayTotalMinutes / 60)}h {todayTotalMinutes % 60}m
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
            tiempo total hoy
          </div>
        </div>

        {/* Col 3: Próximo Descanso */}
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '16px' }}>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            PRÓXIMO DESCANSO
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#00E5D9', marginTop: '2px', lineHeight: 1 }}>
            20m
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
            descanso largo
          </div>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
            después de 4 pomodoros
          </div>
        </div>

      </div>

    </div>
  );
};

// Register widget
WidgetRegistry.register({
  id: 'pomodoro',
  name: 'Pomodoro',
  description: 'Control de sesiones de enfoque, descansos y notas rápidas.',
  defaultSize: 'medium',
  component: PomodoroWidget
});

export default PomodoroWidget;
