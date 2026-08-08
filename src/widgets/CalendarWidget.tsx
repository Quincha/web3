import React, { useState, useEffect } from 'react';
import { WidgetRegistry } from './WidgetRegistry';
import { Clock, Plus, Calendar as CalendarIcon, ArrowRight, Video} from 'lucide-react';

export interface CalendarEvent {
  id: string;
  time: string;
  title: string;
  tag: string;
  duration: string;
  color: string;
  location?: string;
}

export const CalendarWidget: React.FC = () => {
  // Format current date in Spanish
  const todayDate = new Date();
  const dateStr = todayDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  const formattedToday = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  // Live time tracking for timeline line
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      setCurrentTimeStr(`${hrs}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const [events, setEvents] = useState<CalendarEvent[]>([
    { id: '1', time: '09:00', title: 'Daily Sync con Equipo', tag: 'REUNIÓN', duration: '25 min', color: '#10B981', location: 'Google Meet' },
    { id: '2', time: '12:30', title: 'Diseño UX/UI Dashboard', tag: 'PROYECTO', duration: '60 min', color: '#00E5D9', location: 'Figma' },
    { id: '3', time: '16:20', title: 'Revisión Sprint Agosto', tag: 'REVISIÓN', duration: '45 min', color: '#FBBF24' },
    { id: '4', time: '18:00', title: 'Desarrollo Frontend Web3', tag: 'CÓDIGO', duration: '90 min', color: '#A78BFA' },
  ]);

  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('11:00');
  const [newTag, setNewTag] = useState('REUNIÓN');
  const [newDuration] = useState('30 min');

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const colors: Record<string, string> = {
      'REUNIÓN': '#10B981',
      'PROYECTO': '#00E5D9',
      'REVISIÓN': '#FBBF24',
      'CÓDIGO': '#A78BFA',
      'PERSONAL': '#EC4899'
    };

    const newEv: CalendarEvent = {
      id: Date.now().toString(),
      time: newTime,
      title: newTitle.trim(),
      tag: newTag,
      duration: newDuration,
      color: colors[newTag] || '#00E5D9'
    };

    const updated = [...events, newEv].sort((a, b) => a.time.localeCompare(b.time));
    setEvents(updated);
    setNewTitle('');
    setIsAddingEvent(false);
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
      
      {/* Background ambient glow */}
      <div style={{
        position: 'absolute', top: '-40px', right: '-40px',
        width: '160px', height: '160px',
        background: 'radial-gradient(circle, rgba(0, 229, 217, 0.12) 0%, rgba(0,0,0,0) 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarIcon size={18} color="#00E5D9" />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
            Calendario
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            background: 'rgba(255,255,255,0.04)', 
            border: '1px solid rgba(255,255,255,0.08)', 
            padding: '4px 10px', 
            borderRadius: '12px', 
            fontSize: '11px', 
            color: '#00E5D9', 
            fontWeight: 700 
          }}>
            Hoy, {formattedToday}
          </div>

          <button
            onClick={() => setIsAddingEvent(!isAddingEvent)}
            style={{
              background: isAddingEvent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${isAddingEvent ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '8px',
              padding: '6px',
              color: isAddingEvent ? '#EF4444' : '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            title={isAddingEvent ? 'Cancelar' : 'Agendar evento'}
          >
            <Plus size={14} style={{ transform: isAddingEvent ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>
      </div>

      {/* Add Event Form */}
      {isAddingEvent && (
        <form onSubmit={handleAddEvent} style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(0, 229, 217, 0.2)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          position: 'relative',
          zIndex: 10
        }}>
          <input
            type="text"
            placeholder="Título de la reunión o evento..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <input
              type="time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '4px 8px',
                color: '#fff',
                fontSize: '11px'
              }}
            />
            <select
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              style={{
                background: '#0F172A',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '4px 8px',
                color: '#fff',
                fontSize: '11px'
              }}
            >
              <option value="REUNIÓN">REUNIÓN</option>
              <option value="PROYECTO">PROYECTO</option>
              <option value="REVISIÓN">REVISIÓN</option>
              <option value="CÓDIGO">CÓDIGO</option>
              <option value="PERSONAL">PERSONAL</option>
            </select>
            <button
              type="submit"
              style={{
                background: '#00E5D9',
                border: 'none',
                borderRadius: '6px',
                padding: '4px',
                color: '#0B0F19',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Agendar
            </button>
          </div>
        </form>
      )}

      {/* Events List */}
      <div 
        className="custom-scrollbar"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1, 
          gap: '12px', 
          position: 'relative', 
          zIndex: 1,
          maxHeight: '280px',
          overflowY: 'auto',
          paddingRight: '6px'
        }}
      >
        {/* Live Red Timeline Line */}
        {currentTimeStr && (
          <div style={{ position: 'relative', margin: '2px 0', display: 'flex', alignItems: 'center', zIndex: 5 }}>
            <div style={{ fontSize: '10px', color: '#F43F5E', fontWeight: 800, width: '42px', flexShrink: 0 }}>
              {currentTimeStr}
            </div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F43F5E', boxShadow: '0 0 10px #F43F5E', flexShrink: 0 }} />
            <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, #F43F5E 0%, rgba(244, 63, 94, 0.1) 100%)', boxShadow: '0 0 6px #F43F5E' }} />
          </div>
        )}

        {events.map((event) => (
          <div key={event.id} style={{ display: 'flex', gap: '12px', minHeight: '52px', alignItems: 'stretch' }}>
            {/* Time Column */}
            <div style={{ width: '42px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 700, paddingTop: '10px', flexShrink: 0 }}>
              {event.time}
            </div>
            
            {/* Event Card Pill */}
            <div style={{ 
              display: 'flex', 
              flex: 1, 
              background: `linear-gradient(90deg, ${event.color}15 0%, rgba(255,255,255,0.02) 100%)`,
              border: `1px solid ${event.color}30`,
              borderRadius: '12px',
              padding: '10px 14px',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, border-color 0.2s ease'
            }}>
              {/* Left Accent Bar */}
              <div style={{ 
                position: 'absolute', 
                left: 0, 
                top: 0, 
                bottom: 0, 
                width: '4px', 
                backgroundColor: event.color, 
                boxShadow: `0 0 8px ${event.color}80` 
              }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', paddingLeft: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{event.title}</span>
                  {event.tag && (
                    <span style={{ 
                      background: `${event.color}20`, 
                      border: `1px solid ${event.color}40`, 
                      color: event.color, 
                      padding: '2px 6px', 
                      borderRadius: '6px', 
                      fontSize: '9px', 
                      fontWeight: 800, 
                      letterSpacing: '0.05em' 
                    }}>
                      {event.tag}
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={12} color={event.color} />
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 500 }}>{event.duration}</span>
                  </div>

                  {event.location && (
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Video size={10} color={event.color} />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer link */}
      <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a 
          href="#" 
          onClick={e => { 
            e.preventDefault(); 
            window.dispatchEvent(new CustomEvent('change-view', { detail: 'calendario' }));
            window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: 'calendario' })); 
          }}
          style={{ 
            color: '#00E5D9', 
            fontSize: '12px', 
            textDecoration: 'none', 
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>Ver calendario completo</span>
          <ArrowRight size={14} />
        </a>
      </div>

    </div>
  );
};

// Register widget
WidgetRegistry.register({
  id: 'calendario',
  name: 'Calendario',
  description: 'Próximos eventos y reuniones agendadas.',
  defaultSize: 'medium',
  component: CalendarWidget
});

export default CalendarWidget;

