import React, { useState } from 'react';
import {
  CheckCircle2, Circle, Clock, AlertTriangle,
  ChevronDown, ChevronRight, Trash2, Plus, Flame,
  Briefcase, Tag, Calendar, Filter
} from 'lucide-react';
import { useTasks } from '../../context/TasksContext';
import { useClients } from '../../context/ClientsContext';
import type { Task, Priority, TaskStatus, Project } from '../../context/TasksContext';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: React.ReactNode }> = {
  urgent: { label: 'Urgente', color: '#EF4444', icon: <AlertTriangle size={11} /> },
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
// ADD TASK FORM
// ─────────────────────────────────────────────

const AddTaskForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { addTask, getActiveProjects } = useTasks();
  const { getActiveClients } = useClients();
  const projects = getActiveProjects();
  const clients = getActiveClients();
  
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [projectId, setProjectId] = useState<string>(projects[0]?.id || '');
  const [clientId, setClientId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [pomodoros, setPomodoros] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({
      title: title.trim(),
      description: desc.trim(),
      project_id: projectId || null,
      client_id: clientId || null,
      category: 'general',
      priority,
      status: 'pending',
      dueDate: dueDate || null,
      tags: [],
      estimatedPomodoros: pomodoros,
    });
    onClose();
  };

  return (
    <div className="add-task-form-card">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          className="task-form-input task-form-title-input"
          placeholder="Título de la tarea..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
          required
        />
        <textarea
          className="task-form-input task-form-textarea"
          placeholder="Descripción (opcional)"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          rows={2}
        />
        <div className="task-form-row">
          <div className="task-form-field">
            <label>Prioridad</label>
            <select className="task-form-select" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
              {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="task-form-field">
            <label>Proyecto</label>
            <select className="task-form-select" value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">Sin proyecto</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="task-form-field">
            <label>Cliente</label>
            <select className="task-form-select" value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Sin cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="task-form-field">
            <label>Vence</label>
            <input type="date" className="task-form-select" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="task-form-field">
            <label>🍅 Estimados</label>
            <input type="number" className="task-form-select" min={0} max={10} value={pomodoros} onChange={e => setPomodoros(+e.target.value)} />
          </div>
        </div>
        <div className="task-form-actions">
          <button type="button" className="outline-action-btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="action-green-btn">
            <Plus size={14} /> Agregar Tarea
          </button>
        </div>
      </form>
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
  onDelete: (id: string) => void;
  onStartPomodoro: (task: Task) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, content: string) => void;
}> = ({ task, project, onComplete, onDelete, onStartPomodoro, onToggleSubtask, onAddSubtask }) => {
  const [expanded, setExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const pCfg = PRIORITY_CONFIG[task.priority];
  const due = formatDueDate(task.dueDate);
  const subtasksDone = task.subtasks.filter(s => s.completed).length;

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    onAddSubtask(task.id, newSubtask.trim());
    setNewSubtask('');
  };

  return (
    <div className={`task-row-card ${task.status === 'completed' ? 'task-completed' : ''} ${task.status === 'in-progress' ? 'task-in-progress' : ''}`}>
      <div className="task-row-main">
        {/* Complete toggle */}
        <button
          className="task-check-btn"
          onClick={() => onComplete(task.id)}
          title={task.status === 'completed' ? 'Marcar pendiente' : 'Completar tarea'}
        >
          {task.status === 'completed'
            ? <CheckCircle2 size={18} style={{ color: 'var(--accent-green)' }} />
            : <Circle size={18} style={{ color: 'var(--text-subtle)' }} />
          }
        </button>

        {/* Task content */}
        <div className="task-row-content" onClick={() => setExpanded(!expanded)}>
          <div className="task-row-title-line">
            <span className="task-row-title">{task.title}</span>
            {task.subtasks.length > 0 && (
              <span className="subtask-progress-badge">
                {subtasksDone}/{task.subtasks.length}
              </span>
            )}
          </div>
          <div className="task-row-meta">
            {project && (
              <span className="task-project-badge" style={{ borderColor: project.color, color: project.color }}>
                <Briefcase size={10} /> {project.name}
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
            {task.estimatedPomodoros > 0 && (
              <span className="task-pomodoro-badge">
                🍅 {task.completedPomodoros}/{task.estimatedPomodoros}
              </span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        {task.subtasks.length > 0 && (
          <button className="task-expand-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        )}

        {/* Actions */}
        <div className="task-actions-group">
          {task.status !== 'completed' && (
            <button
              className="task-action-btn task-pomodoro-btn"
              onClick={() => onStartPomodoro(task)}
              title="Iniciar sesión Pomodoro para esta tarea"
            >
              <Flame size={14} />
            </button>
          )}
          <button
            className="task-action-btn task-delete-btn"
            onClick={() => onDelete(task.id)}
            title="Eliminar tarea"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Subtasks panel */}
      {expanded && (
        <div className="subtasks-panel">
          {task.subtasks.map(st => (
            <div key={st.id} className={`subtask-row ${st.completed ? 'subtask-done' : ''}`}>
              <button className="subtask-check-btn" onClick={() => onToggleSubtask(task.id, st.id)}>
                {st.completed ? <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} /> : <Circle size={14} />}
              </button>
              <span className="subtask-text">{st.content}</span>
            </div>
          ))}
          <form onSubmit={handleAddSubtask} className="subtask-add-row">
            <Plus size={13} style={{ color: 'var(--text-subtle)' }} />
            <input
              type="text"
              className="subtask-add-input"
              placeholder="Añadir subtarea..."
              value={newSubtask}
              onChange={e => setNewSubtask(e.target.value)}
            />
          </form>
        </div>
      )}
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
  const {
    tasks, projects,
    completeTask, deleteTask, addSubtask, toggleSubtask, getTodayTasks
  } = useTasks();

  const [filter, setFilter] = useState<TaskFilter>('today');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const getFilteredTasks = (): Task[] => {
    let base: Task[] = [];
    if (filter === 'today')     base = getTodayTasks();
    else if (filter === 'urgent') base = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed');
    else if (filter === 'completed') base = tasks.filter(t => t.status === 'completed');
    else base = tasks.filter(t => t.status !== 'cancelled');

    if (projectFilter !== 'all') {
      base = base.filter(t => t.project_id === projectFilter);
    }
    return base;
  };

  const filteredTasks = getFilteredTasks();
  const todayCount = getTodayTasks().length;
  const urgentCount = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;

  const handleStartPomodoro = (task: Task) => {
    const project = projects.find(p => p.id === task.project_id);
    window.dispatchEvent(new CustomEvent('start-pomodoro-for-task', {
      detail: {
        taskId: task.id,
        taskTitle: task.title,
        projectName: project?.name || 'Sin proyecto'
      }
    }));
    window.dispatchEvent(new CustomEvent('change-view', { detail: 'pomodoro' }));
  };

  return (
    <div className="tasks-module-container">
      {/* Header */}
      <div className="module-title-row">
        <div>
          <h2>Tareas & Proyectos</h2>
          <p className="module-subtitle">
            {todayCount} para hoy · {urgentCount} urgentes
          </p>
        </div>
        <button className="action-green-btn" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={14} />
          Nueva Tarea
        </button>
      </div>

      {/* Add task form */}
      {showAddForm && <AddTaskForm onClose={() => setShowAddForm(false)} />}

      {/* Filters */}
      <div className="tasks-filter-bar">
        <div className="tasks-filter-tabs">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.id}
              className={`filter-tab-btn ${filter === opt.id ? 'active' : ''}`}
              onClick={() => setFilter(opt.id)}
            >
              {opt.label}
              {opt.id === 'today' && todayCount > 0 && (
                <span className="filter-count-badge">{todayCount}</span>
              )}
              {opt.id === 'urgent' && urgentCount > 0 && (
                <span className="filter-count-badge filter-count-urgent">{urgentCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Project filter */}
        <div className="project-filter-row">
          <Filter size={13} style={{ color: 'var(--text-subtle)' }} />
          <select
            className="task-form-select"
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
          >
            <option value="all">Todos los proyectos</option>
            {projects.filter(p => !p.archived).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Project color legend */}
      <div className="project-legend-row">
        {projects.filter(p => !p.archived).map(p => (
          <div key={p.id} className="project-legend-item">
            <div className="project-legend-dot" style={{ backgroundColor: p.color }} />
            <span>{p.name}</span>
          </div>
        ))}
      </div>

      {/* Task list */}
      <div className="tasks-list">
        {filteredTasks.length === 0 ? (
          <div className="tasks-empty-state">
            <CheckCircle2 size={32} />
            <p>
              {filter === 'today' ? '¡Todo al día! No hay tareas pendientes para hoy.' : 'Sin tareas en esta categoría.'}
            </p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const project = projects.find(p => p.id === task.project_id);
            return (
              <TaskRow
                key={task.id}
                task={task}
                project={project}
                onComplete={completeTask}
                onDelete={deleteTask}
                onStartPomodoro={handleStartPomodoro}
                onToggleSubtask={toggleSubtask}
                onAddSubtask={addSubtask}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
