import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Clock, Play, 
  CheckCircle2, Circle, Plus, ListTodo, FileText, Paperclip, Activity, RotateCcw, StopCircle
} from 'lucide-react';
import { useTasks } from '../../context/TasksContext';
import { useClients } from '../../context/ClientsContext';
import type { Priority } from '../../context/TasksContext';

interface TaskDetailSidebarProps {
  taskId: string | null;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgente', color: '#F0445E' },
  { value: 'high', label: 'Alta', color: '#F5B83D' },
  { value: 'medium', label: 'Media', color: '#3B82F6' },
  { value: 'low', label: 'Baja', color: '#8994A3' }
];

const CATEGORY_OPTIONS = ['Desarrollo', 'Diseño', 'Personal', 'Investigación', 'Finanzas', 'Hardware'];

export const TaskDetailSidebar: React.FC<TaskDetailSidebarProps> = ({ taskId, onClose }) => {
  const { tasks, updateTask, getActiveProjects, incrementTaskPomodoro } = useTasks();
  const { getActiveClients } = useClients();
  
  const task = tasks.find(t => t.id === taskId);
  const projects = getActiveProjects();
  const clients = getActiveClients();

  // Basic Details
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [projectId, setProjectId] = useState('');
  const [clientId, setClientId] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  
  // Dates
  const [createdAt, setCreatedAt] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  
  // Pomodoro / Stopwatch
  const [pomodoros, setPomodoros] = useState(0);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins
  const timerRef = useRef<number | null>(null);

  // Subtasks
  const [subtasks, setSubtasks] = useState<{ id: string, content: string, completed: boolean, createdAt: string }[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  
  // Notes & Observations
  const [notes, setNotes] = useState('');
  const [observations, setObservations] = useState('');

  // Attachments Mock
  const [attachments] = useState([{ name: 'pomodoro-design.fig', size: '2.4 MB' }]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setCategory(task.category || 'General');
      setProjectId(task.project_id || '');
      setClientId(task.client_id || '');
      setPriority(task.priority);
      
      setCreatedAt(task.createdAt ? task.createdAt.split('T')[0] : '');
      setStartedAt(task.startedAt ? task.startedAt.split('T')[0] : '');
      setDueDate(task.dueDate || '');
      setCompletedAt(task.completedAt ? task.completedAt.split('T')[0] : '');
      
      setPomodoros(task.estimatedPomodoros);
      setCompletedPomodoros(task.completedPomodoros || 0);
      setSubtasks(task.subtasks || []);
      setNotes(task.notes || '');
      setObservations(task.observations || '');
    }
  }, [task]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!taskId || !task) return null;

  const handleSave = () => {
    updateTask(task.id, {
      title,
      category,
      project_id: projectId || null,
      client_id: clientId || null,
      priority,
      dueDate: dueDate || null,
      startedAt: startedAt ? new Date(startedAt).toISOString() : null,
      completedAt: completedAt ? new Date(completedAt).toISOString() : null,
      estimatedPomodoros: pomodoros,
      subtasks,
      notes,
      observations
    });
  };

  const handleBlurSave = () => {
    handleSave();
  };

  const handleAddSubtask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!newSubtask.trim()) return;
      const updated = [...subtasks, { id: 'st_' + Date.now(), content: newSubtask.trim(), completed: false, createdAt: new Date().toISOString() }];
      setSubtasks(updated);
      setNewSubtask('');
      updateTask(task.id, { subtasks: updated });
    }
  };

  const toggleSubtask = (id: string) => {
    const updated = subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s);
    setSubtasks(updated);
    updateTask(task.id, { subtasks: updated });
  };

  const deleteSubtask = (id: string) => {
    const updated = subtasks.filter(s => s.id !== id);
    setSubtasks(updated);
    updateTask(task.id, { subtasks: updated });
  };

  // Timer logic
  const toggleTimer = () => {
    if (isTimerRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsTimerRunning(false);
    } else {
      setIsTimerRunning(true);
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsTimerRunning(false);
            incrementTaskPomodoro(task.id);
            setCompletedPomodoros(cp => cp + 1);
            return 25 * 60; // Reset
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsTimerRunning(false);
    setTimeLeft(25 * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const progressPct = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  // Styles
  const panelStyle: React.CSSProperties = {
    position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px',
    background: '#090E14', borderLeft: '1px solid #1B2632', 
    boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', zIndex: 1000, 
    display: 'flex', flexDirection: 'column',
    animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  const headerStyle: React.CSSProperties = {
    padding: '24px 24px 16px', borderBottom: '1px solid #1B2632',
    display: 'flex', flexDirection: 'column', gap: '8px'
  };

  const contentStyle: React.CSSProperties = {
    padding: '24px', flex: 1, overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: '32px'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '14px', color: '#8994A3', fontWeight: 600, 
    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#111820', border: '1px solid #1B2632', 
    borderRadius: '8px', padding: '10px 12px', color: '#F3F5F7', fontSize: '14px', 
    outline: 'none', transition: 'border-color 0.2s'
  };

  return (
    <>
      <div 
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(5, 8, 12, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 999, animation: 'fadeIn 0.2s ease'
        }}
        onClick={onClose}
      />
      
      <div style={panelStyle}>
        
        {/* HEADER */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              onBlur={handleBlurSave}
              style={{ 
                background: 'transparent', border: 'none', color: '#F3F5F7', 
                fontSize: '20px', fontWeight: 600, outline: 'none', width: '90%'
              }}
            />
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#8994A3', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <select 
              value={category} 
              onChange={e => { setCategory(e.target.value); handleSave(); }}
              style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: '12px', borderRadius: '4px' }}
            >
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* CONTENT */}
        <div style={contentStyle} className="kanban-column-content">
          
          {/* FECHAS */}
          <div>
            <h4 style={sectionTitleStyle}>Fechas</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#596575', marginBottom: '4px', display: 'block' }}>Creación</label>
                <input type="date" value={createdAt} onChange={e => setCreatedAt(e.target.value)} onBlur={handleBlurSave} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#596575', marginBottom: '4px', display: 'block' }}>Inicio</label>
                <input type="date" value={startedAt} onChange={e => setStartedAt(e.target.value)} onBlur={handleBlurSave} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#596575', marginBottom: '4px', display: 'block' }}>Límite</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} onBlur={handleBlurSave} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#596575', marginBottom: '4px', display: 'block' }}>Término</label>
                <input type="date" value={completedAt} onChange={e => setCompletedAt(e.target.value)} onBlur={handleBlurSave} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* POMODORO */}
          <div style={{ background: '#111820', border: '1px solid #1B2632', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h4 style={{ ...sectionTitleStyle, alignSelf: 'flex-start' }}><Clock size={16} /> Pomodoro</h4>
            <div style={{ fontSize: '48px', fontWeight: 300, color: '#00D89A', fontFamily: 'monospace', marginBottom: '8px' }}>
              {formatTime(timeLeft)}
            </div>
            <div style={{ color: '#8994A3', fontSize: '13px', marginBottom: '24px' }}>Enfoque</div>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <button 
                onClick={toggleTimer}
                style={{ 
                  background: isTimerRunning ? '#F0445E' : '#00D89A', color: '#05080C', 
                  border: 'none', borderRadius: '8px', padding: '8px 24px', fontWeight: 600, 
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' 
                }}
              >
                {isTimerRunning ? <StopCircle size={18} /> : <Play size={18} />}
                {isTimerRunning ? 'Pausar' : 'Iniciar'}
              </button>
              <button 
                onClick={resetTimer}
                style={{ background: 'transparent', color: '#F3F5F7', border: '1px solid #1B2632', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}
              >
                <RotateCcw size={18} />
              </button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '12px', color: '#596575' }}>
              <span>Ciclos completados: {completedPomodoros}</span>
              <span>Estimados: {pomodoros}</span>
            </div>
          </div>

          {/* CHECKLIST */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ ...sectionTitleStyle, margin: 0 }}><ListTodo size={16} /> Checklist</h4>
              <span style={{ fontSize: '12px', color: '#8994A3' }}>{completedSubtasks} / {subtasks.length}</span>
            </div>
            
            {/* Progress bar */}
            <div style={{ width: '100%', height: '4px', background: '#1B2632', borderRadius: '2px', marginBottom: '16px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: '#00D89A', transition: 'width 0.3s ease' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {subtasks.map(st => (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#111820', padding: '8px 12px', borderRadius: '8px', border: '1px solid #1B2632' }}>
                  <button onClick={() => toggleSubtask(st.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: st.completed ? '#00D89A' : '#596575', padding: 0 }}>
                    {st.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </button>
                  <span style={{ fontSize: '13px', color: st.completed ? '#596575' : '#F3F5F7', textDecoration: st.completed ? 'line-through' : 'none', flex: 1 }}>
                    {st.content}
                  </span>
                  <button onClick={() => deleteSubtask(st.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#596575' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                <Plus size={16} color="#596575" />
                <input 
                  type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={handleAddSubtask}
                  placeholder="Agregar subtarea..." style={{ background: 'transparent', border: 'none', color: '#F3F5F7', fontSize: '13px', outline: 'none', flex: 1 }}
                />
              </div>
            </div>
          </div>

          {/* NOTES & OBSERVATIONS */}
          <div>
            <h4 style={sectionTitleStyle}><FileText size={16} /> Notas</h4>
            <textarea 
              value={notes} onChange={e => setNotes(e.target.value)} onBlur={handleBlurSave}
              placeholder="El panel debe ser colapsable..."
              style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} 
            />
          </div>
          <div>
            <h4 style={sectionTitleStyle}><FileText size={16} /> Observaciones</h4>
            <textarea 
              value={observations} onChange={e => setObservations(e.target.value)} onBlur={handleBlurSave}
              placeholder="Contexto interno, decisiones..."
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} 
            />
          </div>

          {/* ATTACHMENTS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ ...sectionTitleStyle, margin: 0 }}><Paperclip size={16} /> Adjuntos</h4>
              <button style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '12px', cursor: 'pointer' }}>+ Añadir adjunto</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {attachments.map((att, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#111820', padding: '12px', borderRadius: '8px', border: '1px solid #1B2632' }}>
                  <div style={{ background: 'rgba(240, 68, 94, 0.1)', color: '#F0445E', padding: '8px', borderRadius: '8px' }}>
                    <FileText size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#F3F5F7' }}>{att.name}</div>
                    <div style={{ fontSize: '11px', color: '#596575' }}>{att.size}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* METADATA (Client/Project/Priority) */}
          <div style={{ background: '#111820', borderRadius: '12px', padding: '16px', border: '1px solid #1B2632' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#8994A3', marginBottom: '8px', display: 'block' }}>Proyecto</label>
                <select value={projectId} onChange={e => { setProjectId(e.target.value); handleSave(); }} style={inputStyle}>
                  <option value="">Ninguno</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#8994A3', marginBottom: '8px', display: 'block' }}>Cliente</label>
                <select value={clientId} onChange={e => { setClientId(e.target.value); handleSave(); }} style={inputStyle}>
                  <option value="">Ninguno</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            
            <div style={{ marginTop: '16px' }}>
              <label style={{ fontSize: '12px', color: '#8994A3', marginBottom: '8px', display: 'block' }}>Prioridad</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {PRIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setPriority(opt.value); handleSave(); }}
                    style={{
                      flex: 1, padding: '6px', borderRadius: '6px', fontSize: '12px',
                      background: priority === opt.value ? `${opt.color}20` : 'rgba(255,255,255,0.02)',
                      color: priority === opt.value ? opt.color : '#596575',
                      border: `1px solid ${priority === opt.value ? opt.color : '#1B2632'}`,
                      cursor: 'pointer'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ACTIVITY HISTORY MOCK */}
          <div>
            <h4 style={sectionTitleStyle}><Activity size={16} /> Actividad</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', paddingLeft: '8px' }}>
              <div style={{ borderLeft: '1px dashed #1B2632', position: 'absolute', top: 8, bottom: 8, left: 14 }} />
              <div style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 1 }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3B82F6', border: '3px solid #090E14', marginTop: '4px' }} />
                <div>
                  <div style={{ fontSize: '13px', color: '#F3F5F7' }}>Tarea creada</div>
                  <div style={{ fontSize: '11px', color: '#596575' }}>{createdAt || 'Hoy'}</div>
                </div>
              </div>
              {startedAt && (
                <div style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F5B83D', border: '3px solid #090E14', marginTop: '4px' }} />
                  <div>
                    <div style={{ fontSize: '13px', color: '#F3F5F7' }}>Movida a En proceso</div>
                    <div style={{ fontSize: '11px', color: '#596575' }}>{startedAt}</div>
                  </div>
                </div>
              )}
              {completedAt && (
                <div style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#00D89A', border: '3px solid #090E14', marginTop: '4px' }} />
                  <div>
                    <div style={{ fontSize: '13px', color: '#F3F5F7' }}>Tarea terminada</div>
                    <div style={{ fontSize: '11px', color: '#596575' }}>{completedAt}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
