import React, { useState } from 'react';
import { Circle, CheckCircle2, Plus, Clock, ArrowRight, Tag, Folder } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';
import { useTasks } from '../context/TasksContext';
import type { Priority } from '../context/TasksContext';

const getPriorityStyle = (priority: Priority) => {
  switch (priority) {
    case 'urgent':
      return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', label: 'Urgente' };
    case 'high':
      return { color: '#F97316', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)', label: 'Alta' };
    case 'medium':
      return { color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.3)', label: 'Media' };
    default:
      return { color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.3)', label: 'Baja' };
  }
};

const TasksWidget: React.FC = () => {
  const { getPendingTasks, completeTask, addTask, projects } = useTasks();
  const tasks = getPendingTasks();

  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [taskToConfirm, setTaskToConfirm] = useState<string | null>(null);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    addTask({
      title: newTaskTitle.trim(),
      description: '',
      project_id: projects[0]?.id || null,
      category: 'general',
      priority: newTaskPriority,
      status: 'pending',
      dueDate: new Date().toISOString().split('T')[0],
      tags: ['hoy'],
      estimatedPomodoros: 2
    });

    setNewTaskTitle('');
    setIsAdding(false);
  };

  const getProjectName = (projId: string | null) => {
    if (!projId) return null;
    const p = projects.find(item => item.id === projId);
    return p ? p.name : null;
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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
            Tareas del día
          </h3>
          <span style={{
            background: 'rgba(0, 229, 217, 0.12)',
            border: '1px solid rgba(0, 229, 217, 0.25)',
            color: '#00E5D9',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '12px'
          }}>
            {tasks.length} pendientes
          </span>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          style={{
            background: isAdding ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.06)',
            border: `1px solid ${isAdding ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '8px',
            padding: '6px 10px',
            color: isAdding ? '#EF4444' : '#fff',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s'
          }}
          title={isAdding ? 'Cancelar' : 'Agregar rápida'}
        >
          <Plus size={14} style={{ transform: isAdding ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
          <span>{isAdding ? 'Cancelar' : 'Nueva'}</span>
        </button>
      </div>

      {/* Quick Add Form */}
      {isAdding && (
        <form onSubmit={handleQuickAdd} style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(0, 229, 217, 0.2)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <input
            type="text"
            placeholder="¿Qué tarea deseas realizar hoy?"
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            autoFocus
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['urgent', 'high', 'medium', 'low'] as Priority[]).map(p => {
                const pStyle = getPriorityStyle(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewTaskPriority(p)}
                    style={{
                      background: newTaskPriority === p ? pStyle.bg : 'transparent',
                      border: `1px solid ${newTaskPriority === p ? pStyle.color : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '6px',
                      padding: '3px 8px',
                      color: newTaskPriority === p ? pStyle.color : 'rgba(255,255,255,0.5)',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {pStyle.label}
                  </button>
                );
              })}
            </div>
            <button
              type="submit"
              style={{
                background: '#00E5D9',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 12px',
                color: '#0B0F19',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Guardar Tarea
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      <div 
        className="custom-scrollbar" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px', 
          flex: 1, 
          overflowY: 'auto', 
          maxHeight: '280px', 
          paddingRight: '6px' 
        }}
      >
        {tasks.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '30px 0' }}>
            🎉 ¡Sin tareas pendientes para hoy!
          </div>
        ) : (
          tasks.map(task => {
            const pStyle = getPriorityStyle(task.priority);
            const projName = getProjectName(task.project_id);
            const isConfirming = taskToConfirm === task.id;

            // Sanitize duplicated titles if present
            const cleanTitle = task.title.length > 6 && task.title.slice(0, Math.floor(task.title.length / 2)) === task.title.slice(Math.floor(task.title.length / 2))
              ? task.title.slice(0, Math.floor(task.title.length / 2))
              : task.title;

            return (
              <div 
                key={task.id} 
                style={{ 
                  background: isConfirming ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${isConfirming ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                {isConfirming ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#10B981', fontWeight: 700 }}>
                      ¿Marcar completada esta tarea?
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => setTaskToConfirm(null)}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        No
                      </button>
                      <button 
                        onClick={() => {
                          completeTask(task.id);
                          setTaskToConfirm(null);
                        }}
                        style={{
                          background: '#10B981',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          color: '#000',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        Sí, Completar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      {/* Check Button */}
                      <button 
                        onClick={() => setTaskToConfirm(task.id)}
                        style={{ 
                          background: 'transparent', 
                          border: 'none', 
                          cursor: 'pointer', 
                          padding: 0, 
                          marginTop: '2px',
                          color: 'rgba(255,255,255,0.3)',
                          transition: 'color 0.2s'
                        }}
                        className="hover:text-emerald-400"
                        title="Marcar como completada"
                      >
                        <Circle size={18} />
                      </button>

                      {/* Title & Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          color: '#FFFFFF', 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          lineHeight: 1.3,
                          wordBreak: 'break-word'
                        }}>
                          {cleanTitle}
                        </div>

                        {/* Badges Row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                          {projName && (
                            <span style={{ 
                              fontSize: '10px', 
                              color: 'rgba(255,255,255,0.5)', 
                              background: 'rgba(255,255,255,0.04)', 
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '6px', 
                              padding: '1px 6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Folder size={10} color="#00E5D9" />
                              {projName}
                            </span>
                          )}

                          {task.estimatedPomodoros > 0 && (
                            <span style={{ 
                              fontSize: '10px', 
                              color: 'rgba(255,255,255,0.5)', 
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              <Clock size={10} color="#00E5D9" />
                              {task.completedPomodoros}/{task.estimatedPomodoros} pomos
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Priority Tag */}
                      <div style={{
                        background: pStyle.bg,
                        border: `1px solid ${pStyle.border}`,
                        color: pStyle.color,
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        flexShrink: 0
                      }}>
                        {pStyle.label}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer link */}
      <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a 
          href="#" 
          onClick={e => { 
            e.preventDefault(); 
            window.dispatchEvent(new CustomEvent('change-view', { detail: 'tareas' }));
            window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: 'tareas' })); 
          }}
          style={{ 
            color: '#00E5D9', 
            fontSize: '12px', 
            textDecoration: 'none', 
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'gap 0.2s'
          }}
        >
          <span>Ver todas las tareas</span>
          <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
};

// Register widget
WidgetRegistry.register({
  id: 'tareas',
  name: 'Tareas',
  description: 'Lista de tareas pendientes para el día de hoy.',
  defaultSize: 'medium',
  component: TasksWidget
});

export default TasksWidget;

