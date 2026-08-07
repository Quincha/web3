import React, { useState, useEffect } from 'react';
import { X, Save, Clock, Briefcase, User, Calendar, DollarSign, Tag, Play, CheckCircle2, Circle, Plus, ListTodo } from 'lucide-react';
import { useTasks } from '../../context/TasksContext';
import { useClients } from '../../context/ClientsContext';
import type { Priority } from '../../context/TasksContext';
import { tokens } from '../../theme/tokens';

interface TaskDetailSidebarProps {
  taskId: string | null;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgente', color: tokens.colors.accent.red },
  { value: 'high', label: 'Alta', color: tokens.colors.accent.orange },
  { value: 'medium', label: 'Media', color: tokens.colors.accent.primary },
  { value: 'low', label: 'Baja', color: tokens.colors.accent.cyan }
];

export const TaskDetailSidebar: React.FC<TaskDetailSidebarProps> = ({ taskId, onClose }) => {
  const { tasks, updateTask, getActiveProjects } = useTasks();
  const { getActiveClients } = useClients();
  
  const task = tasks.find(t => t.id === taskId);
  const projects = getActiveProjects();
  const clients = getActiveClients();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [clientId, setClientId] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [pomodoros, setPomodoros] = useState(0);
  const [isBillable, setIsBillable] = useState(false);
  const [price, setPrice] = useState(0);
  const [subtasks, setSubtasks] = useState<{ id: string, content: string, completed: boolean, createdAt: string }[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [createdAt, setCreatedAt] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setProjectId(task.project_id || '');
      setClientId(task.client_id || '');
      setPriority(task.priority);
      setDueDate(task.dueDate || '');
      setPomodoros(task.estimatedPomodoros);
      setIsBillable(task.isBillable || false);
      setPrice(task.price || 0);
      setSubtasks(task.subtasks || []);
      setCreatedAt(new Date(task.createdAt).toLocaleDateString());
    }
  }, [task]);

  if (!taskId || !task) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTask(task.id, {
      title,
      description,
      project_id: projectId || null,
      client_id: clientId || null,
      priority,
      dueDate: dueDate || null,
      estimatedPomodoros: pomodoros,
      isBillable,
      price: isBillable ? price : 0,
      subtasks
    });
    onClose();
  };

  const handleAddSubtask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!newSubtask.trim()) return;
      setSubtasks([...subtasks, { id: 'st_' + Date.now(), content: newSubtask.trim(), completed: false, createdAt: new Date().toISOString() }]);
      setNewSubtask('');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', 
    borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '14px', 
    outline: 'none', boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, 
    display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px'
  };

  return (
    <>
      <div 
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 999, animation: 'fadeIn 0.2s ease'
        }}
        onClick={onClose}
      />
      
      <div 
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px',
          background: 'linear-gradient(145deg, rgba(16, 24, 39, 0.98) 0%, rgba(6, 8, 11, 1) 100%)',
          borderLeft: `1px solid rgba(255,255,255,0.1)`, boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          zIndex: 1000, padding: '24px', display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'white', margin: 0 }}>
            Detalles de Tarea
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>
          Creada el: {createdAt}
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
          
          <div>
            <input 
              type="text" value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="Título de la tarea"
              style={{ ...inputStyle, fontSize: '18px', fontWeight: 600, padding: '16px' }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}><Briefcase size={14} /> Proyecto</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} style={inputStyle}>
                <option value="">Ninguno</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}><User size={14} /> Cliente</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)} style={inputStyle}>
                <option value="">Ninguno</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isBillable ? '16px' : 0 }}>
              <label style={{ ...labelStyle, marginBottom: 0, color: 'white' }}>
                <DollarSign size={16} color={isBillable ? tokens.colors.accent.green : 'rgba(255,255,255,0.5)'} />
                {isBillable ? 'Con Precio / Facturable' : 'Solo Recordatorio'}
              </label>
              <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                <input 
                  type="checkbox" 
                  checked={isBillable} 
                  onChange={e => setIsBillable(e.target.checked)} 
                  style={{ opacity: 0, width: 0, height: 0 }} 
                />
                <span style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: isBillable ? tokens.colors.accent.green : 'rgba(255,255,255,0.2)',
                  transition: '.4s', borderRadius: '34px'
                }}>
                  <span style={{
                    position: 'absolute', content: '""', height: '18px', width: '18px',
                    left: isBillable ? '22px' : '3px', bottom: '3px', backgroundColor: 'white',
                    transition: '.4s', borderRadius: '50%'
                  }}/>
                </span>
              </label>
            </div>
            
            {isBillable && (
              <div>
                <label style={labelStyle}>Monto del servicio</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '12px', color: 'rgba(255,255,255,0.5)' }}>$</span>
                  <input 
                    type="number" value={price} onChange={e => setPrice(Number(e.target.value))} min={0}
                    style={{ ...inputStyle, paddingLeft: '32px', fontSize: '16px', fontWeight: 600, color: tokens.colors.accent.green }} 
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}><Calendar size={14} /> Vencimiento</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}><Clock size={14} /> 🍅 Estimados</label>
              <input type="number" min={0} max={20} value={pomodoros} onChange={e => setPomodoros(Number(e.target.value))} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}><Tag size={14} /> Prioridad</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                    background: priority === opt.value ? `${opt.color}20` : 'rgba(255,255,255,0.05)',
                    color: priority === opt.value ? opt.color : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${priority === opt.value ? opt.color : 'transparent'}`,
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Descripción / Notas</label>
            <textarea 
              value={description} onChange={e => setDescription(e.target.value)} rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} 
              placeholder="Agrega notas o detalles adicionales..."
            />
          </div>

          <div>
            <label style={labelStyle}><ListTodo size={14} /> Sub-tareas</label>
            <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {subtasks.map(st => (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button 
                    type="button"
                    onClick={() => setSubtasks(subtasks.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: st.completed ? tokens.colors.accent.green : 'rgba(255,255,255,0.5)', padding: 0 }}
                  >
                    {st.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </button>
                  <span style={{ fontSize: '14px', color: st.completed ? 'rgba(255,255,255,0.4)' : 'white', textDecoration: st.completed ? 'line-through' : 'none', flex: 1 }}>
                    {st.content}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setSubtasks(subtasks.filter(s => s.id !== st.id))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: subtasks.length > 0 ? '8px' : 0 }}>
                <Plus size={16} color="rgba(255,255,255,0.4)" />
                <input 
                  type="text" 
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={handleAddSubtask}
                  placeholder="Agregar subtarea (Presiona Enter)..."
                  style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '14px', flex: 1, outline: 'none' }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '24px', display: 'flex', gap: '12px' }}>
            <button 
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('change-view', { detail: 'pomodoro' }));
              }}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px', padding: '16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
              }}
            >
              <Play size={16} /> Empezar
            </button>
            <button 
              type="submit"
              style={{
                flex: 1, background: tokens.colors.accent.primary, color: '#000', border: 'none', 
                borderRadius: '12px', padding: '16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                boxShadow: `0 4px 20px ${tokens.colors.accent.primary}40`
              }}
            >
              <Save size={16} /> Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
