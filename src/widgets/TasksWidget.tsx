import React, { useState } from 'react';
import { Circle } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';
import { tokens } from '../theme/tokens';
import { Badge } from '../components/ui/Badge';
import { useTasks } from '../context/TasksContext';
import { Button } from '../components/ui/Button';

const getPriorityColor = (priority: string) => {
  if (priority === 'urgent' || priority === 'high') return tokens.colors.accent.danger;
  if (priority === 'medium') return tokens.colors.accent.warning;
  return tokens.colors.accent.cyan;
};

const getPriorityText = (priority: string) => {
  if (priority === 'urgent') return 'Urgente';
  if (priority === 'high') return 'Alta';
  if (priority === 'medium') return 'Media';
  return 'Baja';
};

const TasksWidget: React.FC = () => {
  const { getPendingTasks } = useTasks();
  const tasks = getPendingTasks();
  const [taskToConfirm, setTaskToConfirm] = useState<string | null>(null);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.space6 }}>
        <h3 style={{ fontSize: tokens.typography.sizes.title, fontWeight: tokens.typography.weights.medium, color: tokens.colors.text.primary, margin: 0 }}>
          Tareas del día
        </h3>
        <Badge variant="default" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>{tasks.length} pendientes</Badge>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.space4, flex: 1, overflowY: 'auto', paddingTop: tokens.spacing.space2 }}>
        {tasks.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '12px' }}>
            No hay tareas pendientes.
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              cursor: 'pointer',
              padding: '8px 0'
            }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.space4, flex: 1, minWidth: 0 }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setTaskToConfirm(task.id); }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    >
                      <Circle size={16} color="rgba(255,255,255,0.2)" />
                    </button>
                    <span style={{ color: tokens.colors.text.primary, fontSize: tokens.typography.sizes.body, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {task.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.space3 }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: getPriorityColor(task.priority) }} />
                    <span style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.sizes.small, fontWeight: tokens.typography.weights.medium }}>
                      {getPriorityText(task.priority)}
                    </span>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 'auto', borderTop: `1px solid ${tokens.colors.border.primary}`, paddingTop: tokens.spacing.space4 }}>
        <a href="#" style={{ color: tokens.colors.accent.green, fontSize: tokens.typography.sizes.small, textDecoration: 'none', fontWeight: tokens.typography.weights.medium }}>
          Ver todas las tareas →
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
