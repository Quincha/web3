import React from 'react';
import { WidgetRegistry } from './WidgetRegistry';
import { tokens } from '../theme/tokens';
import { Clock } from 'lucide-react';

export const CalendarWidget: React.FC = () => {
  const events = [
    { id: 1, time: '09:00', title: 'Daily Sync', tag: 'TEAM', duration: '25 min', color: tokens.colors.accent.green },
    { id: 2, time: '12:30', title: 'Diseño UX/UI', tag: 'PROJECT', duration: '60 min', color: tokens.colors.accent.cyan },
    { id: 3, time: '16:20', title: 'Revisión', tag: 'REVIEW', duration: '45 min', color: tokens.colors.accent.warning },
    { id: 4, time: '18:00', title: 'Dev Frontend', tag: 'CODE', duration: '90 min', color: '#B388FF' },
  ];

  return (
    <div className="dashboard-card">
      {/* Soft gradient orb in background */}
      <div style={{
        position: 'absolute', top: '-50px', right: '-50px',
        width: '150px', height: '150px',
        background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(0,0,0,0) 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '0.1em', margin: 0 }}>
          CALENDARIO
        </h3>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
          Hoy, 24 Jul
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '14px', position: 'relative', zIndex: 1 }}>
        
        {/* Current Time Indicator (mocked position between 12:30 and 16:20) */}
        <div style={{ position: 'absolute', top: '122px', left: 0, right: 0, display: 'flex', alignItems: 'center', zIndex: 2, pointerEvents: 'none' }}>
          <div style={{ fontSize: '11px', color: '#F43F5E', fontWeight: 700, width: '44px' }}>14:15</div>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F43F5E', boxShadow: '0 0 12px #F43F5E', marginLeft: '4px' }}></div>
          <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, #F43F5E 0%, rgba(244, 63, 94, 0) 100%)', boxShadow: '0 0 8px #F43F5E' }}></div>
        </div>

        {events.map((event, index) => (
          <div key={event.id} style={{ display: 'flex', gap: '12px', minHeight: '52px' }}>
            {/* Time */}
            <div style={{ width: '44px', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, paddingTop: '10px' }}>
              {event.time}
            </div>
            
            {/* Event Pill */}
            <div style={{ 
              display: 'flex', 
              flex: 1, 
              background: `linear-gradient(90deg, ${event.color}15 0%, rgba(0,0,0,0.2) 100%)`,
              border: `1px solid ${event.color}30`,
              borderRadius: '12px',
              padding: '10px 14px',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer'
            }} className="event-pill-hover">
              {/* Left Color Bar */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: event.color, boxShadow: `0 0 8px ${event.color}80` }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', paddingLeft: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{event.title}</span>
                  {event.tag && <span style={{ background: `${event.color}20`, border: `1px solid ${event.color}40`, color: event.color, padding: '2px 6px', borderRadius: '6px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em' }}>{event.tag}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={10} color={event.color} />
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 500 }}>{event.duration}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
