import React, { useState } from 'react';
import { usePomodoro} from '../../context/PomodoroContext';
import type { SessionType } from '../../context/PomodoroContext';
import { useTasks } from '../../context/TasksContext';
import { Play, Pause, Square, Flame, Laptop, Calendar,  Plus, Check } from 'lucide-react';

export const PomodoroModule: React.FC = () => {
  const {
    timeRemaining,
  // @ts-expect-error unused
    totalDuration,
    isActive,
    isPaused,
    sessionType,
    project,
    task,
    notes,
    completedSessions,
    startSession,
    pauseSession,
    resumeSession,
    cancelSession,
    finishSession,
    updateNotes
  } = usePomodoro();

  const { getPendingTasks, projects, incrementTaskPomodoro } = useTasks();
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [inputProject, setInputProject] = useState('General');
  const [inputTask, setInputTask] = useState('Sesión de enfoque rápido');
  const [customMinutes, setCustomMinutes] = useState(25);
  
  // Subtasks list (temporary local checklist during active pomodoro session)
  const [subtasks, setSubtasks] = useState<{ id: number; text: string; completed: boolean }[]>([
    { id: 1, text: 'Definir el modelo de datos en PomodoroContext', completed: true },
    { id: 2, text: 'Construir el widget de visualización circular', completed: true },
    { id: 3, text: 'Agregar la sección de notas y subtareas en vivo', completed: false }
  ]);
  const [newSubtask, setNewSubtask] = useState('');

  // Handle external launch event (e.g. from TasksWidget/TasksModule)
  React.useEffect(() => {
    const handleLaunch = (e: Event) => {
      const custom = e as CustomEvent;
      const { taskId, taskTitle, projectName } = custom.detail;
      setSelectedTaskId(taskId);
      setInputTask(taskTitle);
      setInputProject(projectName);
      startSession('work', projectName, taskTitle, 25, taskId);
    };

    const handleCompleted = (e: Event) => {
      const custom = e as CustomEvent;
      incrementTaskPomodoro(custom.detail.taskId);
    };

    window.addEventListener('start-pomodoro-for-task', handleLaunch);
    window.addEventListener('pomodoro-completed-for-task', handleCompleted);
    return () => {
      window.removeEventListener('start-pomodoro-for-task', handleLaunch);
      window.removeEventListener('pomodoro-completed-for-task', handleCompleted);
    };
  }, [startSession, incrementTaskPomodoro]);

  const handleTaskChange = (taskId: string) => {
    setSelectedTaskId(taskId);
    const taskObj = getPendingTasks().find(t => t.id === taskId);
    if (taskObj) {
      setInputTask(taskObj.title);
      const proj = projects.find(p => p.id === taskObj.project_id);
      setInputProject(proj ? proj.name : 'General');
      
      // Load task's subtasks into live session notebook checklist
      if (taskObj.subtasks.length > 0) {
        setSubtasks(taskObj.subtasks.map((s, idx) => ({
          id: idx,
          text: s.content,
          completed: s.completed
        })));
      }
    } else {
      setSelectedTaskId('');
      setInputTask('Sesión de enfoque rápido');
      setInputProject('General');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = (type: SessionType) => {
    startSession(type, inputProject, inputTask, type === 'work' ? customMinutes : undefined, selectedTaskId || undefined);
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    setSubtasks([
      ...subtasks,
      { id: Date.now(), text: newSubtask, completed: false }
    ]);
    setNewSubtask('');
  };

  const toggleSubtask = (id: number) => {
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const formatDate = (isoString: string): string => {
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="pomodoro-module-container">
      <div className="module-title-row">
        <Flame className="brand-accent-text" size={28} />
        <h2>Módulo Pomodoro</h2>
        <span className="module-subtitle">Sesiones de trabajo de alta concentración</span>
      </div>

      <div className="pomodoro-two-col-layout">
        {/* Left Column: Active Session / Configuration */}
        <div className="pomodoro-column-left">
          {isActive ? (
            <div className="active-session-live-card">
              <span className="live-badge">SESIÓN ACTIVA</span>
              
              <div className="circular-progress-large">
                <span className="large-timer-digits">{formatTime(timeRemaining)}</span>
                <span className="large-timer-phase">{sessionType === 'work' ? 'TRABAJO ENFOCADO' : 'DESCANSO'}</span>
              </div>

              <div className="active-session-text-details">
                <h3>{task || 'Sesión de Enfoque'}</h3>
                <span className="active-project-tag">{project || 'Sin Proyecto'}</span>
              </div>

              <div className="timer-large-controls">
                {isPaused ? (
                  <button className="outline-action-btn" onClick={resumeSession}>
                    <Play size={16} /> Reanudar
                  </button>
                ) : (
                  <button className="outline-action-btn" onClick={pauseSession}>
                    <Pause size={16} /> Pausar
                  </button>
                )}
                <button className="outline-action-btn btn-danger-hover" onClick={cancelSession}>
                  <Square size={16} /> Cancelar
                </button>
                <button className="action-green-btn" onClick={finishSession}>
                  <Check size={16} /> Finalizar
                </button>
              </div>

              {/* Live Notebook / Notes */}
              <div className="live-notebook-container">
                <label className="field-label">Notas de la sesión (Se guardan al finalizar)</label>
                <textarea
                  className="live-notes-textarea"
                  value={notes}
                  onChange={(e) => updateNotes(e.target.value)}
                  placeholder="Escribe aquí tus ideas, notas rápidas u observaciones..."
                />
              </div>

              {/* Live Checklist during Pomodoro */}
              <div className="live-checklist-container">
                <label className="field-label">Subtareas / Objetivos</label>
                <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Nueva subtarea..."
                    className="subtask-input-field"
                  />
                  <button type="submit" className="add-subtask-btn">
                    <Plus size={16} />
                  </button>
                </form>
                <div className="subtask-list-scroller">
                  {subtasks.map(s => (
                    <div 
                      key={s.id} 
                      className={`subtask-row-item ${s.completed ? 'done' : ''}`}
                      onClick={() => toggleSubtask(s.id)}
                    >
                      <span className="subtask-check-box">
                        {s.completed && <Check size={12} />}
                      </span>
                      <span className="subtask-text-content">{s.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="pomodoro-setup-card">
              <h3>Nueva Sesión de Enfoque</h3>
              
              <div className="field-container" style={{ marginTop: '16px' }}>
                <label className="field-label">Seleccionar Tarea Activa</label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => handleTaskChange(e.target.value)}
                  className="setup-text-input"
                  style={{ width: '100%', height: '42px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0 10px' }}
                >
                  <option value="">-- Sesión libre / Sin tarea vinculada --</option>
                  {getPendingTasks().map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div className="field-container">
                <label className="field-label">Proyecto</label>
                <input
                  type="text"
                  value={inputProject}
                  onChange={(e) => setInputProject(e.target.value)}
                  className="setup-text-input"
                  disabled={!!selectedTaskId}
                />
              </div>

              <div className="field-container">
                <label className="field-label">Descripción de Actividad</label>
                <input
                  type="text"
                  value={inputTask}
                  onChange={(e) => setInputTask(e.target.value)}
                  className="setup-text-input"
                  disabled={!!selectedTaskId}
                />
              </div>

              <div className="duration-selector-row">
                <div className="duration-input-box">
                  <label className="field-label">Tiempo (Minutos)</label>
                  <input
                    type="number"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Number(e.target.value))}
                    min="1"
                    max="180"
                    className="setup-number-input"
                  />
                </div>
              </div>

              <div className="start-actions-grid">
                <button className="action-green-btn" onClick={() => handleStart('work')}>
                  Iniciar Bloque de Trabajo
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button className="outline-action-btn" onClick={() => handleStart('short-break')}>
                    Descanso Corto
                  </button>
                  <button className="outline-action-btn" onClick={() => handleStart('long-break')}>
                    Descanso Largo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Historical Logs */}
        <div className="pomodoro-column-right">
          <div className="historical-logs-card">
            <h3>Historial de Sesiones</h3>
            <div className="logs-scroller">
              {completedSessions.length === 0 ? (
                <p className="logs-empty-text">No has registrado sesiones hoy.</p>
              ) : (
                completedSessions.map(log => (
                  <div key={log.id} className="pomodoro-log-row">
                    <div className="log-row-header">
                      <span className={`log-type-tag type-${log.type}`}>
                        {log.type === 'work' ? 'Enfoque' : 'Descanso'}
                      </span>
                      <span className="log-duration">{log.durationMinutes} min</span>
                    </div>
                    <span className="log-task">{log.task}</span>
                    <span className="log-project">{log.project}</span>
                    {log.notes && (
                      <div className="log-notes-bubble">
                        <strong>Notas:</strong> {log.notes}
                      </div>
                    )}
                    <div className="log-row-footer">
                      <div className="log-device-badge">
                        <Laptop size={12} />
                        <span>{log.device}</span>
                      </div>
                      <div className="log-time-badge">
                        <Calendar size={12} />
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
