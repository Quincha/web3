import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { WidgetRegistry } from './WidgetRegistry';
import { Clock, Plus, Calendar as CalendarIcon, ArrowRight, Video} from 'lucide-react';
import { useHealth } from '../context/HealthContext';
import { usePomodoro } from '../context/PomodoroContext';
import { useBujo } from '../context/BujoContext';
import { Api } from '../services/ApiClient';
import { subscribeGcalPush } from '../services/gcalPush';

export interface CalendarEvent {
  id: string;
  time: string;
  title: string;
  tag: string;
  duration: string;
  color: string;
  location?: string;
  datetime?: string;
  date?: string;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

export const CalendarWidget: React.FC = () => {
  // Real calendar data
  const { appointments, profiles } = useHealth();
  const { completedSessions } = usePomodoro();
  const { entries, addEntry } = useBujo();

  // Google Calendar events (external)
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const loadGoogleEvents = useCallback(async () => {
    try {
      const res = await Api.gcalEvents(60);
      setGoogleEvents(Array.isArray(res.items) ? res.items : []);
    } catch {
      setGoogleEvents([]);
    }
  }, []);
  useEffect(() => { loadGoogleEvents(); }, [loadGoogleEvents]);
  // Recarga automática cuando Google Calendar cambia el evento desde otro
  // dispositivo (webhook -> SSE del servidor).
  useEffect(() => {
    const unsubscribe = subscribeGcalPush(loadGoogleEvents);
    const onFocus = () => loadGoogleEvents();
    window.addEventListener('focus', onFocus);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, [loadGoogleEvents]);

  // From today until +6 days (week window)
  const scopeDays = useMemo(() => {
    const days: { date: string; weekday: string }[] = [];
    const names = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push({ date: localDateStr(d), weekday: names[d.getDay()] });
    }
    return days;
  }, []);

  const events = useMemo<CalendarEvent[]>(() => {
    const list: CalendarEvent[] = [];

    // Appointments (health) within the 7-day scope
    appointments.forEach(appt => {
      const d = appt.dateTime.split('T')[0];
      if (!scopeDays.some(s => s.date === d)) return;
      const prof = profiles.find(p => p.id === appt.profile_id);
      list.push({
        id: `cal_health_${appt.id}`,
        time: (appt.dateTime.split('T')[1] || '').slice(0, 5),
        title: `🩺 ${appt.specialty}${prof ? ` (${prof.name})` : ''}`,
        tag: 'REUNIÓN',
        duration: `Dr. ${appt.professional}`,
        color: '#EF4444',
        location: appt.clinic,
        date: d,
      });
    });

    // Tasks due within scope
    // (las tareas no se muestran en el widget del calendario por decisión del usuario)

    // Bujo events within scope
    entries.forEach(entry => {
      if (!scopeDays.some(s => s.date === entry.date)) return;
      // Solo eventos programados (reuniones/bloques). Se excluyen espejos de
      // tareas (linkedTaskId) y entradas de tipo "task".
      if (entry.gcalEventId) return;
      if (entry.linkedTaskId) return;
      if (entry.type !== 'event' && entry.type !== 'scheduled') return;
      list.push({
        id: `w_bujo_${entry.id}`,
        time: entry.time || '',
        title: `📅 ${entry.content}`,
        tag: 'REUNIÓN',
        duration: entry.duration || 'Calendario',
        color: '#FFA726',
        date: entry.date,
      });
    });

    // Completed pomodoros within scope
    completedSessions.forEach(session => {
      const d = session.timestamp.split('T')[0];
      if (!scopeDays.some(s => s.date === d)) return;
      list.push({
        id: `w_pomo_${session.id}`,
        time: (session.timestamp.split('T')[1] || '').slice(0, 5),
        title: `🍅 ${session.task}`,
        tag: 'CÓDIGO',
        duration: session.project || 'Pomodoro',
        color: '#F97316',
        date: d,
      });
    });

    // Google Calendar events within scope
    googleEvents.forEach((ev: any) => {
      const start = ev.start?.dateTime || ev.start?.date || '';
      if (!start) return;
      const d = start.split('T')[0];
      if (!scopeDays.some(s => s.date === d)) return;
      const hasTime = Boolean(ev.start?.dateTime);
      list.push({
        id: `w_google_${ev.id}`,
        time: hasTime ? (start.split('T')[1] || '').slice(0, 5) : '',
        title: `🗓 ${ev.summary || 'Evento Google'}`,
        tag: 'REUNIÓN',
        duration: hasTime ? 'Google Calendar' : 'Todo el día',
        color: '#4285F4',
        location: ev.location,
        date: d,
      });
    });

    // Sort by date then by time (all-day/no-time entries go first for the day)
    return list.sort((a, b) => {
      const ad = a.date || '';
      const bd = b.date || '';
      if (ad !== bd) return ad < bd ? -1 : 1;
      const at = a.time === '' ? '00:00' : a.time;
      const bt = b.time === '' ? '00:00' : b.time;
      if (at !== bt) return at < bt ? -1 : 1;
      return a.time === '' ? -1 : b.time === '' ? 1 : 0;
    });
  }, [appointments, profiles, completedSessions, entries, googleEvents, scopeDays]);

  const todayLocal = localDateStr(new Date());

  const isToday = (d?: string) => d === todayLocal;

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

  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('11:00');
  const [newTag, setNewTag] = useState('REUNIÓN');
  const [newDuration] = useState('30 min');

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const colors: Record<string, string> = {
      'REUNIÓN': '#10B981',
      'PROYECTO': '#00E5D9',
      'REVISIÓN': '#FBBF24',
      'CÓDIGO': '#A78BFA',
      'PERSONAL': '#EC4899'
    };

    const dateTime = `${todayLocal}T${newTime}:00`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Crear en Google Calendar (si la conexión falla, solo queda local)
    let gcalEventId: string | undefined;
    try {
      const created = await Api.gcalCreateEvent({
        summary: newTitle.trim(),
        start: dateTime,
        allDay: false,
        timeZone: tz,
      });
      gcalEventId = created.id;
    } catch (err) {
      console.error('No se pudo crear evento en Google:', err);
    }

    const newEv: CalendarEvent = {
      id: Date.now().toString(),
      time: newTime,
      title: newTitle.trim(),
      tag: newTag,
      duration: newDuration,
      color: colors[newTag] || '#00E5D9',
      datetime: dateTime,
      date: todayLocal,
    };
    // Persiste en el BuJo para que también aparezca en el calendario del sistema
    addEntry(newTitle.trim(), 'event', [newTag, 'Calendario'], newDuration, undefined, todayLocal, undefined, gcalEventId, newTime);
    if (gcalEventId) {
      // El evento ya vive en Google; recargar para mostrarlo sin duplicados
      loadGoogleEvents();
    } else {
      // Sin conexión a Google: se muestra local
      setLocalEvents(prev => [...prev, newEv]);
    }
    setNewTitle('');
    setIsAddingEvent(false);
  };

  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>([]);
  const allEvents = useMemo(() => {
    const merged = [...events, ...localEvents];
    return merged.sort((a, b) => a.time.localeCompare(b.time));
  }, [events, localEvents]);

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

        {allEvents.map((event, idx) => {
          const dayInfo = scopeDays.find(s => s.date === event.date);
          const showDayHeader = idx === 0 || allEvents[idx - 1].date !== event.date;
          const dayLabel = isToday(event.date) ? 'Hoy' : `${dayInfo?.weekday || ''} ${Number((event.date || '').split('-')[2]) || ''}`;
          return (
          <React.Fragment key={event.id}>
            {showDayHeader && (
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: showDayHeader && idx !== 0 ? '8px' : '0' }}>
                {dayLabel}
              </div>
            )}
          <div style={{ display: 'flex', gap: '12px', minHeight: '52px', alignItems: 'stretch' }}>
            {/* Time Column */}
            <div style={{ width: '42px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 700, paddingTop: '10px', flexShrink: 0 }}>
              {event.time || 'Todo el día'}
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
                    {event.time ? <Clock size={12} color={event.color} /> : null}
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 500 }}>
                      {event.time ? `${event.time}` : event.duration}
                    </span>
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
          </React.Fragment>
          );
        })}
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

