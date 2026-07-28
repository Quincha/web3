import React from 'react';
import { ExternalLink, Clock, Utensils, Rocket } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';
import { tokens } from '../theme/tokens';

const BujoWidget: React.FC = () => {
  const logs = [
    { id: 1, time: '08:00', title: 'Inicio de jornada', color: tokens.colors.accent.green, icon: <Clock size={12} /> },
    { id: 2, time: '12:30', title: 'Almuerzo', color: tokens.colors.accent.cyan, icon: <Utensils size={12} /> },
    { id: 3, time: '18:00', title: 'Final de jornada', color: tokens.colors.accent.warning, icon: <Rocket size={12} /> },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.space6 }}>
        <h3 style={{ fontSize: tokens.typography.sizes.title, fontWeight: tokens.typography.weights.medium, color: tokens.colors.text.primary }}>
          Daily Log (Bujo)
        </h3>
        <button style={{ background: 'transparent', border: 'none', color: tokens.colors.text.muted, cursor: 'pointer' }}>
          <ExternalLink size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', paddingLeft: tokens.spacing.space4 }}>
        {logs.map((log, index) => (
          <div key={log.id} style={{ display: 'flex', gap: tokens.spacing.space4, minHeight: '60px', position: 'relative' }}>
            {/* Timeline line */}
            {index < logs.length - 1 && (
              <div style={{ 
                position: 'absolute', 
                left: '67px', 
                top: '28px', 
                bottom: '-4px', 
                width: '2px', 
                backgroundColor: 'rgba(255,255,255,0.05)' 
              }} />
            )}

            {/* Time */}
            <div style={{ width: '40px', paddingTop: '4px' }}>
              <span style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.sizes.small, fontWeight: tokens.typography.weights.medium }}>
                {log.time}
              </span>
            </div>
            
            {/* Dot and Content */}
            <div style={{ display: 'flex', gap: tokens.spacing.space4, alignItems: 'flex-start' }}>
              {/* Icon Dot */}
              <div style={{ 
                width: '24px', 
                height: '24px', 
                borderRadius: '50%', 
                background: `linear-gradient(135deg, ${log.color}20, ${log.color}10)`, 
                border: `1px solid ${log.color}40`,
                color: log.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '0px',
                position: 'relative',
                zIndex: 2,
                boxShadow: `0 0 10px ${log.color}20`
              }}>
                {log.icon}
              </div>
              
              {/* Event Details */}
              <div style={{ paddingTop: '2px' }}>
                <span style={{ color: tokens.colors.text.primary, fontSize: tokens.typography.sizes.body, fontWeight: tokens.typography.weights.medium }}>
                  {log.title}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', borderTop: `1px solid ${tokens.colors.border.primary}`, paddingTop: tokens.spacing.space4 }}>
        <a href="#" style={{ color: tokens.colors.accent.green, fontSize: tokens.typography.sizes.small, textDecoration: 'none', fontWeight: tokens.typography.weights.medium }}>
          Abrir Bullet Journal →
        </a>
      </div>
    </div>
  );
};

// Register widget
WidgetRegistry.register({
  id: 'bujo',
  name: 'Bullet Journal',
  description: 'Registro rápido de tareas, notas y eventos del día.',
  defaultSize: 'medium',
  component: BujoWidget
});

export default BujoWidget;
