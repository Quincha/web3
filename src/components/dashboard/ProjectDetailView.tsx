import React, { useState } from 'react';
import {
  X, Plus, CheckCircle2, Circle, Trash2, Briefcase, Calendar as CalendarIcon,
  ListTodo, Target, ChevronDown, ClipboardList
} from 'lucide-react';
import { useTasks } from '../../context/TasksContext';
import type { Project, Task } from '../../context/TasksContext';
import { tokens } from '../../theme/tokens';

interface ProjectDetailViewProps {
  project: Project;
  onClose: () => void;
}

type TaskFilter = 'todas' | 'pendientes' | 'completadas';

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'completadas', label: 'Completadas' },
];

function formatDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, onClose }) => {
  const { tasks, addTask, updateTask, deleteTask, addSubtask, toggleSubtask, deleteSubtask } = useTasks();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [subtaskInputs, setSubtaskInputs] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<TaskFilter>('todas');
  const [openSubtasks, setOpenSubtasks] = useState<Record<string, boolean>>({});

  const projectTasks = tasks
    .filter(t => t.project_id === project.id && t.status !== 'cancelled')
    .sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return b.createdAt.localeCompare(a.createdAt);
    });

  const total = projectTasks.length;
  const completed = projectTasks.filter(t => t.status === 'completed').length;
  const pending = total - completed;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  const visible = filter === 'todas'
    ? projectTasks
    : filter === 'pendientes'
      ? projectTasks.filter(t => t.status !== 'completed')
      : projectTasks.filter(t => t.status === 'completed');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    addTask({
      title,
      description: '',
      project_id: project.id,
      client_id: project.client_id ?? null,
      category: 'general',
      priority: 'medium',
      status: 'pending',
      dueDate: null,
      tags: [],
      estimatedPomodoros: 1,
      isBillable: false,
      price: 0,
    });
    setNewTaskTitle('');
  };

  const handleToggleComplete = (task: Task) => {
    if (task.status === 'completed') {
      updateTask(task.id, { status: 'pending', completedAt: null });
    } else {
      window.dispatchEvent(new CustomEvent('request-task-completion', { detail: { taskId: task.id } }));
    }
  };

  const handleDeleteTask = (task: Task) => {
    if (window.confirm(`¿Borrar la tarea "${task.title}"?`)) {
      deleteTask(task.id);
    }
  };

  const handleAddSubtask = (taskId: string) => {
    const content = (subtaskInputs[taskId] || '').trim();
    if (!content) return;
    addSubtask(taskId, content);
    setSubtaskInputs(s => ({ ...s, [taskId]: '' }));
  };

  const toggleSubtasksPanel = (taskId: string) => {
    setOpenSubtasks(s => ({ ...s, [taskId]: !s[taskId] }));
  };

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 999, animation: 'fadeIn 0.2s ease'
        }}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '460px',
          maxWidth: '100vw',
          background: 'linear-gradient(145deg, rgba(16, 24, 39, 0.98) 0%, rgba(6, 8, 11, 1) 100%)',
          borderLeft: `1px solid ${project.color || tokens.colors.accent.primary}40`,
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          zIndex: 1000, display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 24px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: project.color || tokens.colors.accent.primary,
              background: `${project.color || tokens.colors.accent.primary}15`,
              padding: '4px 10px', borderRadius: '8px'
            }}>
              <Briefcase size={12} /> Proyecto
            </span>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'white', margin: '0 0 6px 0', lineHeight: 1.2 }}>
            {project.name}
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
            {project.description || 'Sin descripción'}
          </p>

          {/* Stats + progress */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
              <Target size={14} color={project.color || tokens.colors.accent.primary} /> {total} tareas
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
              <Circle size={14} color={tokens.colors.accent.warning} /> {pending} pendientes
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
              <CheckCircle2 size={14} color={tokens.colors.accent.green} /> {completed} completadas
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${progress}%`, height: '100%',
                background: project.color || tokens.colors.accent.primary,
                transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)'
              }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: project.color || tokens.colors.accent.primary }}>{progress}%</span>
          </div>

          {/* Quick add task */}
          <form onSubmit={handleAddTask} style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'rgba(0,0,0,0.3)', border: `1px solid ${project.color || tokens.colors.accent.primary}40`,
              borderRadius: '12px', padding: '6px 10px'
            }}>
              <Plus size={18} color={project.color || tokens.colors.accent.primary} />
              <input
                type="text"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Nueva tarea del proyecto (Enter)..."
                style={{
                  flex: 1, background: 'transparent', border: 'none', color: 'white',
                  fontSize: '14px', outline: 'none', padding: '8px 0'
                }}
              />
            </div>
          </form>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                  background: filter === f.id ? `${project.color || tokens.colors.accent.primary}20` : 'rgba(255,255,255,0.05)',
                  color: filter === f.id ? (project.color || tokens.colors.accent.primary) : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${filter === f.id ? (project.color || tokens.colors.accent.primary) : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Task list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {visible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
              <ClipboardList size={36} style={{ marginBottom: '10px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '13px' }}>No hay tareas {filter !== 'todas' ? `en "${filter}"` : 'en este proyecto'}.</p>
            </div>
          ) : visible.map(task => {
            const subDone = task.subtasks.filter(s => s.completed).length;
            const subOpen = Boolean(openSubtasks[task.id]);
            return (
              <div key={task.id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '12px',
                opacity: task.status === 'completed' ? 0.6 : 1
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <button
                    onClick={() => handleToggleComplete(task)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: task.status === 'completed' ? tokens.colors.accent.green : 'rgba(255,255,255,0.4)', marginTop: 1 }}
                  >
                    {task.status === 'completed' ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: '14px', fontWeight: 600, color: task.status === 'completed' ? 'rgba(255,255,255,0.5)' : 'white',
                      textDecoration: task.status === 'completed' ? 'line-through' : 'none'
                    }}>
                      {task.title}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                        {task.dueDate && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                            <CalendarIcon size={11} />
                            {formatDateTime(task.dueDate)}
                          </span>
                        )}
                        {task.subtasks.length > 0 && (
                          <button
                            onClick={() => toggleSubtasksPanel(task.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px',
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: subDone === task.subtasks.length ? tokens.colors.accent.green : 'rgba(255,255,255,0.5)'
                            }}
                          >
                            <ListTodo size={11} />
                            {subDone}/{task.subtasks.length} subtareas
                            <ChevronDown size={11} style={{ transform: subOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                          </button>
                        )}
                        <button
                          onClick={() => toggleSubtasksPanel(task.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: tokens.colors.accent.primary
                          }}
                        >
                          <Plus size={11} />
                          {task.subtasks.length > 0 ? 'Añadir subtarea' : 'Agregar subtarea'}
                        </button>
                      </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTask(task)}
                    title="Borrar tarea"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '4px' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Subtasks */}
                {openSubtasks[task.id] && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {task.subtasks.map(st => (
                      <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '6px' }}>
                        <button
                          onClick={() => toggleSubtask(task.id, st.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: st.completed ? tokens.colors.accent.green : 'rgba(255,255,255,0.35)', padding: 0 }}
                        >
                          {st.completed ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                        </button>
                        <span style={{ flex: 1, fontSize: '13px', color: st.completed ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)', textDecoration: st.completed ? 'line-through' : 'none' }}>
                          {st.content}
                        </span>
                        <button
                          onClick={() => deleteSubtask(task.id, st.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: '2px' }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '6px', marginTop: '2px' }}>
                      <Plus size={14} color={project.color || tokens.colors.accent.primary} />
                      <input
                        type="text"
                        value={subtaskInputs[task.id] || ''}
                        onChange={e => setSubtaskInputs(s => ({ ...s, [task.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(task.id); } }}
                        placeholder="Agregar subtarea (Enter)..."
                        style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '13px', outline: 'none', padding: '4px 0' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};