import React from 'react';
import { Settings, Circle } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';
import { tokens } from '../theme/tokens';
import { Badge } from '../components/ui/Badge';

const TasksWidget: React.FC = () => {
  const tasks = [
    { id: 1, title: 'Diseñar landing page', priority: 'Alta', color: tokens.colors.accent.danger },
    { id: 2, title: 'Revisar documentación técnica', priority: 'Media', color: tokens.colors.accent.warning },
    { id: 3, title: 'Implementar autenticación', priority: 'Alta', color: tokens.colors.accent.danger },
    { id: 4, title: 'Reunión con el equipo', priority: 'Baja', color: tokens.colors.accent.cyan },
    { id: 5, title: 'Configurar servidor de producción', priority: 'Media', color: tokens.colors.accent.warning },
    { id: 6, title: 'Escribir reporte semanal', priority: 'Baja', color: tokens.colors.accent.cyan },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.space6 }}>
        <h3 style={{ fontSize: tokens.typography.sizes.title, fontWeight: tokens.typography.weights.medium, color: tokens.colors.text.primary }}>
          Tareas del día
        </h3>
        <Badge variant="default" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>6 pendientes</Badge>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.space4, flex: 1, overflowY: 'auto', paddingTop: tokens.spacing.space2 }}>
        {tasks.map(task => (
          <div key={task.id} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.space4 }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid rgba(22, 240, 181, 0.3)` }} />
              <span style={{ color: tokens.colors.text.primary, fontSize: tokens.typography.sizes.body }}>{task.title}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.space3 }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: task.color }} />
              <span style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.sizes.small, fontWeight: tokens.typography.weights.medium }}>{task.priority}</span>
            </div>
          </div>
        ))}
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
