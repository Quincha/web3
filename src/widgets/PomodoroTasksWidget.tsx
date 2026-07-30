import React, { useState } from 'react';
import { Settings, Play, CheckCircle2, Circle, Pause, Square } from 'lucide-react';
import { usePomodoro } from '../context/PomodoroContext';
import { useTasks } from '../context/TasksContext';
import { tokens } from '../theme/tokens';
import { Button } from '../components/ui/Button';

export const PomodoroTasksWidget: React.FC = () => {
  const { timeRemaining, totalDuration, isActive, isPaused, task: currentTaskTitle, activeTaskId, startSession, pauseSession, resumeSession, cancelSession } = usePomodoro();
  const { getPendingTasks } = useTasks();
  const [taskToConfirm, setTaskToConfirm] = useState<string | null>(null);

  const pendingTasks = getPendingTasks();
  const recentPending = pendingTasks.slice(0, 3);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSpentTime = (seconds: number | undefined): string => {
    if (!seconds) return '0h 0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const getProgressPercentage = (): number => {
    if (totalDuration === 0) return 0;
    return ((totalDuration - timeRemaining) / totalDuration) * 100;
  };

  const strokeDashoffset = 282.6 - (282.6 * getProgressPercentage()) / 100;

  const handleStart = () => {
    startSession('work', 'Enfoque general', 'Sesión iniciada desde widget unificado');
  };

  return (
    <div className="premium-card-hover" style={{
      background: 'linear-gradient(145deg, rgba(16, 42, 45, 0.4) 0%, rgba(6, 8, 11, 0.9) 100%)',
      borderRadius: '24px',
      padding: '28px',
      border: `1px solid ${tokens.colors.accent.green}40`,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Glow */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '150px',
        height: '150px',
        background: `radial-gradient(circle, ${tokens.colors.accent.green}30 0%, transparent 70%)`,
        filter: 'blur(30px)',
        zIndex: 0
      }}></div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Play size={20} color={tokens.colors.accent.green} />
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: tokens.colors.accent.green, letterSpacing: '0.1em', margin: 0 }}>
            POMODORO & DAILY TASKS
          </h3>
        </div>
        <button style={{ background: 'transparent', border: 'none', color: tokens.colors.text.muted, cursor: 'pointer' }}>
          <Settings size={16} />
        </button>
      </div>

      {/* Pomodoro Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '32px' }}>
        {/* Progress Circular Timer */}
        <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 100 100">
            {/* Base Circle */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(0, 208, 132, 0.15)" strokeWidth="4" />
            {/* Progress Circle */}
            <circle 
              cx="50" cy="50" r="45" fill="none" 
              stroke={tokens.colors.accent.green} strokeWidth="4" strokeLinecap="round"
              strokeDasharray="282.6" strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span className="outfit" style={{ fontSize: '24px', fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
              {formatTime(timeRemaining)}
            </span>
            <span style={{ fontSize: '11px', color: tokens.colors.accent.green, fontWeight: 600, letterSpacing: '0.1em', marginTop: '4px' }}>
              ENFOQUE
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
            {isActive ? (currentTaskTitle || 'Sesión en progreso') : 'No hay ninguna sesión activa.'}
          </span>
          
          {!isActive ? (
            <Button 
              onClick={handleStart}
              variant="primary" 
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                background: `linear-gradient(90deg, ${tokens.colors.accent.green}, ${tokens.colors.accent.bright})`,
                color: '#000',
                fontWeight: 600,
                boxShadow: `0 8px 24px ${tokens.colors.accent.green}40`,
                border: 'none',
                borderRadius: '30px'
              }}
            >
              Iniciar 25 min
            </Button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <Button 
                onClick={isPaused ? resumeSession : pauseSession}
                variant="ghost" 
                style={{ 
                  flex: 1, 
                  justifyContent: 'center', 
                  borderColor: tokens.colors.accent.cyan,
                  color: tokens.colors.accent.cyan,
                  backgroundColor: 'transparent',
                  borderRadius: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isPaused ? <Play size={16} /> : <Pause size={16} />}
                {isPaused ? 'Reanudar' : 'Pausar'}
              </Button>
              <Button 
                onClick={cancelSession}
                variant="ghost" 
                style={{ 
                  flex: 1, 
                  justifyContent: 'center', 
                  borderColor: tokens.colors.accent.danger,
                  color: tokens.colors.accent.danger,
                  backgroundColor: 'transparent',
                  borderRadius: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Square size={16} />
                Detener
              </Button>
            </div>
          )}
        </div>
      </div>

      <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '24px' }} />

      {/* Tasks Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
          TAREAS DEL DÍA
        </h3>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
          {pendingTasks.length} pendientes
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
        {recentPending.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '12px' }}>
            No hay tareas pendientes.
          </div>
        ) : (
          recentPending.map(task => {
            const isTaskActive = activeTaskId === task.id;
            
            return (
              <div 
                key={task.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '8px 12px', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s',
                  background: isTaskActive ? 'rgba(0, 208, 132, 0.1)' : 'transparent',
                  border: `1px solid ${isTaskActive ? 'rgba(0, 208, 132, 0.3)' : 'transparent'}`,
                  borderRadius: '8px'
                }}
                onClick={() => {
                  if (!isTaskActive) {
                    startSession('work', 'General', task.title, 25, task.id);
                  }
                }}
                onMouseEnter={(e) => {
                  if (!isTaskActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!isTaskActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  {taskToConfirm === task.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <span style={{ fontSize: '13px', color: tokens.colors.text.primary, fontWeight: 500 }}>¿Marcar como completada?</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setTaskToConfirm(null); }} style={{ flex: 1, padding: '4px' }}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={(e) => { 
                          e.stopPropagation(); 
                          window.dispatchEvent(new CustomEvent('request-task-completion', { detail: { taskId: task.id } }));
                          setTaskToConfirm(null); 
                        }} style={{ flex: 1, padding: '4px', background: tokens.colors.accent.green, color: '#000' }}>
                          Sí, Completar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setTaskToConfirm(task.id); }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      >
                        <Circle size={16} color="rgba(255,255,255,0.2)" />
                      </button>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '14px', color: isTaskActive ? tokens.colors.accent.green : 'rgba(255,255,255,0.85)', fontWeight: isTaskActive ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isTaskActive && (
                            <span style={{ fontSize: '10px', color: tokens.colors.accent.green, fontWeight: 700, letterSpacing: '0.05em' }}>EN PROCESO</span>
                          )}
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                            {formatSpentTime(task.timeSpentSeconds)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {taskToConfirm !== task.id && task.priority === 'high' && <span style={{ fontSize: '12px', color: tokens.colors.accent.danger, whiteSpace: 'nowrap' }}>• Alta</span>}
                {taskToConfirm !== task.id && task.priority === 'medium' && <span style={{ fontSize: '12px', color: tokens.colors.accent.warning, whiteSpace: 'nowrap' }}>• Media</span>}
                {taskToConfirm !== task.id && task.priority === 'low' && <span style={{ fontSize: '12px', color: tokens.colors.accent.cyan, whiteSpace: 'nowrap' }}>• Baja</span>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
