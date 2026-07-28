import React from 'react';
import { Activity as ActivityIcon, CheckCircle, FileText, Users } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';
import { tokens } from '../theme/tokens';

const ActivityWidget: React.FC = () => {
  const activities = [
    { id: 1, text: 'Completaste la tarea "Diseño del Hero"', time: 'hace 2 horas', icon: <CheckCircle size={16} />, color: tokens.colors.accent.green },
    { id: 2, text: 'Actualizaste el documento "Design System"', time: 'hace 4 horas', icon: <FileText size={16} />, color: tokens.colors.accent.cyan },
    { id: 3, text: 'Nuevo miembro añadido al equipo', time: 'ayer', icon: <Users size={16} />, color: '#B388FF' },
    { id: 4, text: 'Reunión de sincronización finalizada', time: 'ayer', icon: <CheckCircle size={16} />, color: tokens.colors.accent.green },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.space6 }}>
        <h3 style={{ fontSize: tokens.typography.sizes.title, fontWeight: tokens.typography.weights.medium, color: tokens.colors.text.primary }}>
          Actividad reciente
        </h3>
        <button style={{ background: 'transparent', border: 'none', color: tokens.colors.text.muted, cursor: 'pointer' }}>
          <ActivityIcon size={16} />
        </button>
      </div>



      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.space4, flex: 1, overflowY: 'auto', zIndex: 1 }}>
        {activities.map(activity => (
          <div key={activity.id} style={{ display: 'flex', gap: tokens.spacing.space4, alignItems: 'flex-start' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '2px', 
              background: tokens.colors.accent.cyan,
              marginTop: '6px',
              boxShadow: `0 0 8px ${tokens.colors.accent.cyan}60`,
              flexShrink: 0
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ color: tokens.colors.text.primary, fontSize: tokens.typography.sizes.body }}>
                {activity.text}
              </span>
              <span style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.sizes.small }}>
                {activity.time}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', borderTop: `1px solid ${tokens.colors.border.primary}`, paddingTop: tokens.spacing.space4, zIndex: 1 }}>
        <a href="#" style={{ color: tokens.colors.accent.green, fontSize: tokens.typography.sizes.small, textDecoration: 'none', fontWeight: tokens.typography.weights.medium }}>
          Ver toda la actividad →
        </a>
      </div>
    </div>
  );
};

// Register widget
WidgetRegistry.register({
  id: 'activity',
  name: 'Actividad Reciente',
  description: 'Registro de las últimas acciones realizadas en la plataforma.',
  defaultSize: 'medium',
  component: ActivityWidget
});

export default ActivityWidget;
