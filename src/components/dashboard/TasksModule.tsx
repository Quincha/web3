import React, { useState } from 'react';
import { 
  CheckCircle2, Plus, Clock, Circle, XCircle, MoreVertical, 
  Briefcase, Tag, Calendar, Filter, User, DollarSign, Building2,
  ChevronDown, ChevronRight, Trash2, Flame
} from 'lucide-react';
import { useTasks } from '../../context/TasksContext';
import { useClients } from '../../context/ClientsContext';
import type { Task, Priority, TaskStatus, Project } from '../../context/TasksContext';
import { TaskDetailSidebar } from './TaskDetailSidebar';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const tokens = { colors: { accent: { primary: '#3B82F6', green: '#10B981', orange: '#F59E0B' } } };

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: React.ReactNode }> = {
  urgent: { label: 'Urgente', color: '#EF4444', icon: <div /> },
  high:   { label: 'Alta',    color: '#F59E0B', icon: <ChevronDown size={11} style={{ transform: 'rotate(180deg)' }} /> },
  medium: { label: 'Media',   color: '#3B82F6', icon: <ChevronDown size={11} /> },
  low:    { label: 'Baja',    color: '#6B7280', icon: <ChevronDown size={11} /> },
};

function formatDueDate(iso: string | null): { label: string; urgent: boolean } {
  if (!iso) return { label: 'Sin fecha', urgent: false };
  const today = new Date().toISOString().split('T')[0];
  const diff = Math.ceil((new Date(iso + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000);
  if (diff < 0) return { label: `Vencida hace ${Math.abs(diff)}d`, urgent: true };
  if (diff === 0) return { label: 'Hoy', urgent: true };
  if (diff === 1) return { label: 'Mañana', urgent: false };
  return { label: `${diff} días`, urgent: false };
}

// ─────────────────────────────────────────────
// QUICK ENTRY BAR
// ─────────────────────────────────────────────

const QuickEntryBar: React.FC = () => {
  const { addTask } = useTasks();
  const { getActiveClients } = useClients();
  const clients = getActiveClients();
  
  const [title, setTitle] = useState('');
  const [defaultClientId, setDefaultClientId] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && title.trim()) {
      addTask({
        title: title.trim(),
        description: '',
        project_id: null,
        client_id: defaultClientId || null,
        category: 'general',
        priority: 'medium',
        status: 'pending',
        dueDate: null,
        tags: [],
        estimatedPomodoros: 1,
        isBillable: false,
        price: 0,
        subtasks: [],
        completedPomodoros: 0,
        createdAt: new Date().toISOString()
      });
      setTitle('');
    }
  };

  return (
    <div style={{ 
      background: 'rgba(0,0,0,0.4)', border: `1px solid ${tokens.colors.accent.primary}40`, 
      borderRadius: '12px', padding: '8px 12px', display: 'flex', gap: '12px', alignItems: 'center',
      marginBottom: '24px', boxShadow: `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.05)`
    }}>
      <div style={{ color: tokens.colors.accent.primary, display: 'flex', alignItems: 'center' }}>
        <Plus size={20} />
      </div>
      <input 
        type="text"
        placeholder="Escribe una tarea y presiona Enter para guardar..."
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          flex: 1, background: 'transparent', border: 'none', color: 'white', 
          fontSize: '15px', outline: 'none', padding: '8px 0'
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px' }}>
        <User size={16} color="rgba(255,255,255,0.5)" />
        <select 
          value={defaultClientId} 
          onChange={e => setDefaultClientId(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', 
            color: 'white', padding: '4px 8px', fontSize: '13px', outline: 'none', cursor: 'pointer'
          }}
        >
          <option value="">Sin Cliente</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// TASK ROW
// ─────────────────────────────────────────────

const TaskRow: React.FC<{
  task: Task;
  project?: Project;
  onComplete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, content: string) => void;
  onClick: (taskId: string) => void;
}> = ({ task, project, onComplete, onUpdate, onClick }) => {
  const { getClientById, getActiveClients } = useClients();
  const clients = getActiveClients();
  
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [inlinePrice, setInlinePrice] = useState(task.price || 0);
  
  const pCfg = PRIORITY_CONFIG[task.priority];
  const due = formatDueDate(task.dueDate);
  const client = task.client_id ? getClientById(task.client_id) : null;

  return (
    <div className={`task-row-card ${task.status === 'completed' ? 'task-completed' : ''}`}>
      <div className="task-row-main">
        <button className="task-check-btn" onClick={() => onComplete(task.id)}>
          {task.status === 'completed' ? <CheckCircle2 size={18} color="var(--accent-green)" /> : <Circle size={18} />}
        </button>

        <div className="task-row-content" onClick={() => onClick(task.id)} style={{ cursor: 'pointer' }}>
          <div className="task-row-title-bar">
            <span className="task-row-title">{task.title}</span>
          </div>
          <div className="task-row-meta">
            {project && (
              <span className="task-meta-pill" style={{ color: project.color, background: `${project.color}15` }}>
                <Briefcase size={12} /> {project.name}
              </span>
            )}
            
            {client ? (
              <select 
                value={task.client_id || ''} 
                onChange={e => onUpdate(task.id, { client_id: e.target.value || null })}
                onClick={e => e.stopPropagation()}
                className="task-meta-pill" 
                style={{ color: client.color, background: `${client.color}15`, border: 'none', appearance: 'none', cursor: 'pointer', paddingRight: '8px' }}
              >
                <option value={client.id}>{client.name}</option>
                {clients.filter(c => c.id !== client.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="">Quitar Cliente</option>
              </select>
            ) : (
              <select 
                value="" 
                onChange={e => onUpdate(task.id, { client_id: e.target.value || null })}
                onClick={e => e.stopPropagation()}
                className="task-meta-pill" 
                style={{ color: tokens.colors.accent.orange, background: `${tokens.colors.accent.orange}15`, border: 'none', appearance: 'none', cursor: 'pointer' }}
              >
                <option value="" disabled>+ Añadir Cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}

            {task.isBillable ? (
              isEditingPrice ? (
                <span className="task-meta-pill" style={{ color: tokens.colors.accent.green, background: `${tokens.colors.accent.green}15` }}>
                  <DollarSign size={12} /> 
                  <input 
                    type="number" 
                    value={inlinePrice}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                    onChange={e => setInlinePrice(Number(e.target.value))}
                    onBlur={() => {
                      setIsEditingPrice(false);
                      onUpdate(task.id, { price: inlinePrice });
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        setIsEditingPrice(false);
                        onUpdate(task.id, { price: inlinePrice });
                      }
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'inherit', width: '60px', outline: 'none', fontWeight: 600, fontSize: '12px' }}
                  />
                </span>
              ) : (
                <span 
                  className="task-meta-pill" 
                  onClick={(e) => { e.stopPropagation(); setIsEditingPrice(true); setInlinePrice(task.price || 0); }}
                  style={{ color: tokens.colors.accent.green, background: `${tokens.colors.accent.green}15`, fontWeight: 600, cursor: 'pointer' }}
                >
                  <DollarSign size={12} /> ${task.price?.toLocaleString()}
                </span>
              )
            ) : (
              <span 
                className="task-meta-pill" 
                onClick={(e) => { e.stopPropagation(); onUpdate(task.id, { isBillable: true, price: 0 }); }}
                style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer' }}
                title="Hacer facturable"
              >
                <Tag size={12} /> Recordatorio
              </span>
            )}

            <span className="task-priority-badge" style={{ color: pCfg.color }}>
              {pCfg.icon} {pCfg.label}
            </span>
            {task.dueDate && (
              <span className={`task-due-badge ${due.urgent ? 'due-urgent' : ''}`}>
                <Calendar size={10} /> {due.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN MODULE
// ─────────────────────────────────────────────

type TaskFilter = 'today' | 'all' | 'urgent' | 'completed';
const FILTER_OPTIONS: { id: TaskFilter; label: string }[] = [
  { id: 'today',     label: 'Hoy' },
  { id: 'all',       label: 'Todas' },
  { id: 'urgent',    label: 'Urgentes' },
  { id: 'completed', label: 'Completadas' },
];

export const TasksModule: React.FC = () => {
  const { tasks, getActiveProjects, updateTask, getTodayTasks } = useTasks();
  const [filter, setFilter] = useState<TaskFilter>('today');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const projects = getActiveProjects();

  const getFilteredTasks = (): Task[] => {
    let base: Task[] = [];
    if (filter === 'today')     base = getTodayTasks();
    else if (filter === 'urgent') base = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed');
    else if (filter === 'completed') base = tasks.filter(t => t.status === 'completed');
    else base = tasks.filter(t => t.status !== 'cancelled');
    return base;
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div className="tasks-module-container">
      <QuickEntryBar />

      <div className="tasks-filter-bar">
        <div className="tasks-filter-tabs">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.id}
              className={`filter-tab-btn ${filter === opt.id ? 'active' : ''}`}
              onClick={() => setFilter(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tasks-list">
        {filteredTasks.map(task => {
            const project = projects.find(p => p.id === task.project_id);
            return (
              <TaskRow
                key={task.id}
                task={task}
                project={project}
                onComplete={(id) => {
                  window.dispatchEvent(new CustomEvent('request-task-completion', { detail: { taskId: id } }));
                }}
                onUpdate={updateTask}
                onAddSubtask={(taskId, content) => {
                  const t = tasks.find(x => x.id === taskId);
                  if (t) updateTask(taskId, { subtasks: [...t.subtasks, { id: 'st_'+Date.now(), content, completed: false, createdAt: new Date().toISOString() }] });
                }}
                onToggleSubtask={() => {}}
                onClick={taskId => setSelectedTaskId(taskId)}
              />
            );
        })}
      </div>

      <TaskDetailSidebar taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
};
