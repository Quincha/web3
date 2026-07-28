import React from 'react';
import { Play, Settings } from 'lucide-react';
import { usePomodoro } from '../context/PomodoroContext';
import { WidgetRegistry } from './WidgetRegistry';
import { tokens } from '../theme/tokens';
import { Button } from '../components/ui/Button';

const PomodoroWidget: React.FC = () => {
  const { 
    timeRemaining, 
    totalDuration, 
    isActive, 
    startSession, 
  } = usePomodoro();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    if (totalDuration === 0) return 0;
    return ((totalDuration - timeRemaining) / totalDuration) * 100;
  };

  const strokeDashoffset = 282.6 - (282.6 * getProgressPercentage()) / 100;

  const handleQuickStart = () => {
    startSession('work', 'Proyecto: QuinchaDoro', 'Sesión de enfoque rápido');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.space6 }}>
        <h3 style={{ fontSize: tokens.typography.sizes.title, fontWeight: tokens.typography.weights.medium, color: tokens.colors.text.primary }}>
          Pomodoro
        </h3>
        <button style={{ background: 'transparent', border: 'none', color: tokens.colors.text.muted, cursor: 'pointer' }}>
          <Settings size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.space6, marginBottom: tokens.spacing.space6 }}>
        {/* Progress Circular Timer */}
        <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 100 100">
            {/* Base Circle */}
            <circle 
              cx="50" 
              cy="50" 
              r="45" 
              fill="transparent" 
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="6" 
            />
            
            {/* Subtle Radial Progress Lines (Dashed inner circle) */}
            <circle 
              cx="50" 
              cy="50" 
              r="38" 
              fill="transparent" 
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="2" 
              strokeDasharray="2 4"
            />

            {/* Active Progress Circle */}
            <circle 
              cx="50" 
              cy="50" 
              r="45" 
              fill="transparent" 
              stroke={tokens.colors.accent.green}
              strokeWidth="6" 
              strokeDasharray="282.6"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 6px ${tokens.colors.glow.green})` }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span className="outfit" style={{ fontSize: tokens.typography.sizes.h2, fontWeight: tokens.typography.weights.bold, color: tokens.colors.accent.bright, lineHeight: 1, filter: `drop-shadow(0 0 8px ${tokens.colors.glow.green})` }}>
              {formatTime(timeRemaining)}
            </span>
            <span style={{ fontSize: tokens.typography.sizes.caption, color: tokens.colors.accent.green, fontWeight: tokens.typography.weights.bold, letterSpacing: '0.05em', marginTop: tokens.spacing.space1 }}>
              ENFOQUE
            </span>
          </div>
        </div>

        {/* Current task information */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: tokens.spacing.space4 }}>
          {isActive ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.space2 }}>
              <p style={{ color: tokens.colors.text.primary, fontSize: tokens.typography.sizes.subtitle }}>Sesión en progreso...</p>
            </div>
          ) : (
            <>
              <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.sizes.small, lineHeight: 1.4 }}>No hay ninguna sesión activa.</p>
              <Button variant="primary" size="sm" onClick={handleQuickStart} style={{ padding: '0 16px' }}>
                Iniciar 25 min
              </Button>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 'auto', borderTop: `1px solid ${tokens.colors.border.primary}`, paddingTop: tokens.spacing.space4, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.space1 }}>
          <span style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.sizes.caption }}>Sesiones hoy</span>
          <span style={{ color: tokens.colors.text.primary, fontSize: tokens.typography.sizes.small, fontWeight: tokens.typography.weights.medium }}>0/4</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.space1, textAlign: 'right' }}>
          <span style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.sizes.caption }}>Tiempo total</span>
          <span style={{ color: tokens.colors.text.primary, fontSize: tokens.typography.sizes.small, fontWeight: tokens.typography.weights.medium }}>0h 00m</span>
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
