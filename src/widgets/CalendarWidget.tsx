import React from 'react';
import { WidgetRegistry } from './WidgetRegistry';
import { tokens } from '../theme/tokens';
import { Badge } from '../components/ui/Badge';

const CalendarWidget: React.FC = () => {
  const events = [
    { id: 1, time: '09:00', title: 'Daily Sync', duration: '25 min', color: tokens.colors.accent.green },
    { id: 2, time: '10:30', title: 'Diseño UX/UI', duration: '60 min', color: tokens.colors.accent.cyan },
    { id: 3, time: '14:30', title: 'Revisión de proyecto', duration: '45 min', color: tokens.colors.accent.warning },
    { id: 4, time: '16:00', title: 'Desarrollo Frontend', duration: '90 min', color: '#B388FF' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.space6 }}>
        <h3 style={{ fontSize: tokens.typography.sizes.title, fontWeight: tokens.typography.weights.medium, color: tokens.colors.text.primary }}>
          Calendario
        </h3>
        <Badge variant="default" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>Hoy, 24 Jul</Badge>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', paddingLeft: tokens.spacing.space2 }}>
        {events.map((event, index) => (
          <div key={event.id} style={{ display: 'flex', gap: tokens.spacing.space4, minHeight: '60px' }}>
            {/* Timeline Column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px' }}>
              <span style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.sizes.small, fontWeight: tokens.typography.weights.medium }}>
                {event.time}
              </span>
            </div>
            
            {/* Line and Content */}
            <div style={{ display: 'flex', gap: tokens.spacing.space4, flex: 1, position: 'relative' }}>
              {/* Elegant Bar */}
              <div style={{ 
                width: '4px', 
                backgroundColor: event.color, 
                borderRadius: '4px',
                opacity: 0.85,
                margin: '2px 0 12px 0',
                boxShadow: `0 0 10px ${event.color}40`
              }} />
              
              {/* Event Details */}
              <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '2px' }}>
                <span style={{ color: tokens.colors.text.primary, fontSize: tokens.typography.sizes.body, fontWeight: tokens.typography.weights.medium }}>
                  {event.title}
                </span>
                <span style={{ color: event.color, fontSize: tokens.typography.sizes.small }}>
                  {event.duration}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', borderTop: `1px solid ${tokens.colors.border.primary}`, paddingTop: tokens.spacing.space4 }}>
        <a href="#" style={{ color: tokens.colors.accent.green, fontSize: tokens.typography.sizes.small, textDecoration: 'none', fontWeight: tokens.typography.weights.medium }}>
          Ver calendario completo →
        </a>
      </div>
    </div>
  );
};

// Register widget
WidgetRegistry.register({
  id: 'calendario_widget',
  name: 'Calendario',
  description: 'Eventos y reuniones programadas para el día.',
  defaultSize: 'medium',
  component: CalendarWidget
});

export default CalendarWidget;
