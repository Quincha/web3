import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { LayoutGrid, List, CalendarDays, Stethoscope, CheckSquare, Clock, BookOpen, Plus, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useHealth } from '../../context/HealthContext';
import { useTasks } from '../../context/TasksContext';
import { usePomodoro } from '../../context/PomodoroContext';
import { useBujo } from '../../context/BujoContext';
import { Api } from '../../services/ApiClient';

type EventSource = 'health' | 'tasks' | 'pomodoro' | 'bujo' | 'google';

interface CalendarEvent {
  id: string;
  source: EventSource;
  sourceId: string;
  title: string;
  description: string;
  start: string;           // ISO DateTime string or Date "YYYY-MM-DD"
  allDay: boolean;
  color: string;
  meta?: {
    profileName?: string;
    priority?: string;
    projectName?: string;
    location?: string;
  };
}

// Fecha local "YYYY-MM-DD" sin depender de UTC (evita marcar el día siguiente
// por la zona horaria, p.ej. remarcar domingo cuando localmente es sábado).
function localDateToStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const CalendarModule: React.FC = () => {
  const { appointments, profiles, updateAppointment, deleteAppointment } = useHealth();
  const { tasks, projects, updateTask, deleteTask } = useTasks();
  const { completedSessions } = usePomodoro();
  const { entries, addEntry, updateEntry, deleteEntry } = useBujo();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(localDateToStr(new Date()));
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');

  // Drag & drop state
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
  
  // Add Event Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTag, setNewEventTag] = useState('Personal');

  // Google Calendar events (external)
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [gcalConnected, setGcalConnected] = useState(false);

  const loadGoogleEvents = useCallback(async () => {
    try {
      const res = await Api.gcalEvents(90);
      setGcalConnected(!!res.connected);
      setGoogleEvents(Array.isArray(res.items) ? res.items : []);
    } catch {
      setGcalConnected(false);
      setGoogleEvents([]);
    }
  }, []);

  useEffect(() => { loadGoogleEvents(); }, [loadGoogleEvents]);

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    // Si Google Calendar está conectado, el evento vive en Google (evita
    // crear una copia BuJo extra que se vería duplicada en el calendario).
    if (gcalConnected) {
      Api.gcalCreateEvent({
        summary: newEventTitle.trim(),
        start: `${selectedDateStr}T12:00:00`,
        allDay: true,
      })
        .then(() => loadGoogleEvents())
        .catch(err => console.error('No se pudo crear evento en Google:', err));
    } else {
      // Sin conexión a Google: guarda el evento en el BuJo local
      addEntry(
        newEventTitle.trim(),
        'event',
        [newEventTag, 'Calendario'],
        undefined,
        undefined,
        selectedDateStr
      );
    }

    setNewEventTitle('');
    setShowAddModal(false);
  };

  // Aggregate events from all contexts
  const aggregatedEvents = useMemo<CalendarEvent[]>(() => {
    const list: CalendarEvent[] = [];

    // 1. Appointments (Health)
    appointments.forEach(appt => {
      const prof = profiles.find(p => p.id === appt.profile_id);
      list.push({
        id: `cal_health_${appt.id}`,
        source: 'health',
        sourceId: appt.id,
        title: `🩺 Cita: ${appt.specialty} (${prof?.name || 'Familiar'})`,
        description: `${appt.clinic} - Dr. ${appt.professional}. Notas: ${appt.notes}`,
        start: appt.dateTime,
        allDay: false,
        color: '#EF4444',
        meta: { profileName: prof?.name }
      });
    });

    // 2. Tasks Due Dates
    tasks.forEach(task => {
      if (task.dueDate && task.status !== 'cancelled') {
        const proj = projects.find(p => p.id === task.project_id);
        list.push({
          id: `cal_task_${task.id}`,
          source: 'tasks',
          sourceId: task.id,
          title: `📋 Tarea: ${task.title}`,
          description: task.description || 'Sin descripción',
          start: `${task.dueDate}T00:00:00`,
          allDay: true,
          color: proj?.color || '#3B82F6',
          meta: { priority: task.priority, projectName: proj?.name }
        });
      }
    });

    // 3. Completed Pomodoros
    completedSessions.forEach(session => {
      list.push({
        id: `cal_pomodoro_${session.id}`,
        source: 'pomodoro',
        sourceId: session.id,
        title: `🍅 Pomodoro: ${session.task}`,
        description: `Proyecto: ${session.project}. Notas: ${session.notes}`,
        start: session.timestamp,
        allDay: false,
        color: '#F97316',
        meta: { projectName: session.project }
      });
    });

    // 4. Bullet Journal Daily Logs & Events
    entries.forEach(entry => {
      // Entradas espejo automáticas (ya mostradas por su fuente real):
      // tareas → linkedTaskId; pomodoros → "⏱️ Sesión completada";
      // tareas completadas → "✅ Tarea completada". Evitan duplicados.
      if (entry.linkedTaskId) return;
      if (entry.content.startsWith('⏱️ Sesión completada')) return;
      if (entry.content.startsWith('✅ Tarea completada')) return;
      // Ya sincronizados con Google (aparecen como evento de Google en la sección 5)
      if (entry.gcalEventId) return;

      let iconPrefix = '📓';
      let eventColor = '#9CA3AF'; // Default gray for generic entries

      if (entry.type === 'event') {
        iconPrefix = '📅 Evento:';
        eventColor = '#FFA726'; // Bright orange for BuJo events
      } else if (entry.type === 'task') {
        iconPrefix = '📌 Tarea BuJo:';
        eventColor = '#10B981'; // Green for tasks
      } else if (entry.type === 'completed') {
        iconPrefix = '✅ Completada:';
        eventColor = '#059669';
      } else if (entry.type === 'note') {
        iconPrefix = '📝 Nota:';
        eventColor = '#AB47BC'; // Purple for notes
      }

      list.push({
        id: `cal_bujo_${entry.id}`,
        source: 'bujo',
        sourceId: entry.id,
        title: `${iconPrefix} ${entry.content}`,
        description: `Entrada BuJo (${entry.type}) ${entry.duration ? `• ${entry.duration}` : ''} ${entry.assignee ? `• @${entry.assignee}` : ''}`,
        start: `${entry.date}T${entry.time || '12:00'}:00`,
        allDay: !entry.time,
        color: eventColor
      });
    });

    // 5. Google Calendar events (external)
    googleEvents.forEach((ev: any) => {
      const start = ev.start?.dateTime || ev.start?.date || '';
      if (!start) return;
      const allDay = Boolean(ev.start?.date);
      list.push({
        id: `cal_google_${ev.id}`,
        source: 'google',
        sourceId: ev.id,
        title: `🗓 ${ev.summary || 'Evento Google'}`,
        description: ev.description || (allDay ? 'Evento de Google Calendar' : ''),
        start: allDay ? `${start}T12:00:00` : start,
        allDay,
        color: '#4285F4',
        meta: { location: ev.location }
      });
    });

    // Sort chronological: timed events first (by time), then all-day in place
    return list.sort((a, b) => {
      const ta = (a.start || '').split('T')[1] || '';
      const tb = (b.start || '').split('T')[1] || '';
      if (a.allDay && !b.allDay) return 1;
      if (!a.allDay && b.allDay) return -1;
      if (!a.allDay && !b.allDay) {
        const aT = new Date(a.start).getTime();
        const bT = new Date(b.start).getTime();
        if (!isNaN(aT) && !isNaN(bT) && aT !== bT) return aT - bT;
      }
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    });
  }, [appointments, tasks, completedSessions, entries, projects, profiles, googleEvents]);

  // Calendar math helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const weekdayLong = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday...

  const handlePrevMonth = () => {
    if (view === 'day') {
      const d = new Date(dayDate);
      d.setDate(d.getDate() - 1);
      setSelectedDateStr(localDateToStr(d));
    } else if (view === 'week') {
      const d = new Date(weekStart);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const handleNextMonth = () => {
    if (view === 'day') {
      const d = new Date(dayDate);
      d.setDate(d.getDate() + 1);
      setSelectedDateStr(localDateToStr(d));
    } else if (view === 'week') {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const goToday = () => {
    const t = new Date();
    setSelectedDateStr(localDateToStr(t));
    if (view === 'day') {
      setCurrentDate(t);
    } else if (view === 'week') {
      setCurrentDate(t);
    } else {
      setCurrentDate(new Date(t.getFullYear(), t.getMonth(), 1));
    }
  };

  const todayStr = localDateToStr(new Date());
  const isSelectedToday = selectedDateStr === todayStr;

  const fmtTime = (iso: string) => {
    const t = iso?.split('T')[1];
    return t ? t.slice(0, 5) : '';
  };

  // Week view helpers: days of the week that contains currentDate (Monday-first)
  const weekStart = useMemo(() => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // Day view: the date to show in "Día" mode
  const dayDate = useMemo(() => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDateStr]);

  // Days rendered in the timeline: 1 for "Día", 7 for "Semana"
  const timelineDays = view === 'day' ? [dayDate] : weekDays;
  const timelineCols = timelineDays.length;

  // Drag & drop: persist a date (or datetime) change to the right source
  const moveEventToDate = async (ev: CalendarEvent, targetDateStr: string, targetTime?: string) => {
    const iso = targetTime ? `${targetDateStr}T${targetTime}:00` : `${targetDateStr}T${(ev.start.split('T')[1] || '09:00:00')}`;
    if (ev.source === 'google') {
      // Mover en Google Calendar (usa el id real del evento)
      try {
        await Api.gcalUpdateEvent(ev.sourceId, {
          start: ev.allDay ? `${targetDateStr}T12:00:00` : iso,
          allDay: ev.allDay,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        await loadGoogleEvents();
      } catch (err) {
        console.error('No se pudo mover evento en Google:', err);
      }
    } else if (ev.source === 'health') {
      updateAppointment(ev.sourceId, { dateTime: iso });
    } else if (ev.source === 'tasks') {
      updateTask(ev.sourceId, { dueDate: targetDateStr });
    } else if (ev.source === 'bujo') {
      const e = entries.find(x => `cal_bujo_${x.id}` === ev.id);
      if (e) {
        // Si el evento tenía hora, actualizarla al mover por el timeline; si es
        // all-day, solo la fecha.
        const updates: Record<string, unknown> = { date: targetDateStr };
        if (targetTime) updates.time = targetTime;
        updateEntry(e.id, updates);
      }
    }
    // pomodoro = immutable historical log; ignored
    setDraggingEvent(null);
  };

  // Delete an event from its source (Google Calendar o el contexto local)
  const deleteEvent = async (ev: CalendarEvent) => {
    const label = ev.title.replace(/^[^\s]+\s/, '').slice(0, 40);
    if (!window.confirm(`¿Eliminar "${label}"?`)) return;
    try {
      if (ev.source === 'google') {
        await Api.gcalDeleteEvent(ev.sourceId);
        await loadGoogleEvents();
      } else if (ev.source === 'health') {
        deleteAppointment(ev.sourceId);
      } else if (ev.source === 'tasks') {
        deleteTask(ev.sourceId);
      } else if (ev.source === 'bujo') {
        const e = entries.find(x => `cal_bujo_${x.id}` === ev.id);
        if (e) deleteEntry(e.id);
      }
      // pomodoro = immutable historical log; ignored
    } catch (err) {
      console.error('No se pudo eliminar el evento:', err);
    }
  };

  const handleDragStart = (e: React.DragEvent, ev: CalendarEvent) => {
    setDraggingEvent(ev);
    e.dataTransfer.setData('text/plain', `${ev.id}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnDay = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    if (draggingEvent) moveEventToDate(draggingEvent, targetDateStr);
    setDraggingEvent(null);
  };

  const handleDropOnTime = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    if (!draggingEvent) { setDraggingEvent(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.max(0, Math.min(23, Math.floor(y / 44)));
    const minuteH = (y - hour * 44) / 44;
    const minutes = Math.floor(minuteH * 60);
    const mm = Math.floor(minutes / 15) * 15;
    const time = `${hour.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
    moveEventToDate(draggingEvent, targetDateStr, time);
    setDraggingEvent(null);
  };

  const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => `${h.toString().padStart(2, '0')}:00`);
  const HOUR_PX = 44;

  // Filter events for active selected day details
  const selectedDayEvents = useMemo(() => {
    return aggregatedEvents.filter(e => {
      const eDate = e.start.split('T')[0];
      return eDate === selectedDateStr;
    });
  }, [aggregatedEvents, selectedDateStr]);

  const getSourceIcon = (source: EventSource, color?: string) => {
    switch (source) {
      case 'health':   return <Stethoscope size={14} style={{ color: '#EF4444' }} />;
      case 'tasks':    return <CheckSquare size={14} style={{ color: '#3B82F6' }} />;
      case 'pomodoro': return <Clock size={14} style={{ color: '#F97316' }} />;
      case 'google':   return <span style={{ color: '#4285F4', fontSize: '11px', fontWeight: 800, lineHeight: 1 }}>G</span>;
      default:         return <BookOpen size={14} style={{ color: color || '#FFA726' }} />;
    }
  };

  return (
    <div className="calendar-module-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>

      {/* Main Calendar Card (full width) */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {view === 'month' ? (
                <>{monthNames[month]} <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{year}</span></>
              ) : view === 'day' ? (
                <>{weekdayLong[dayDate.getDay()]}, {dayDate.getDate()} de {monthNames[dayDate.getMonth()]} <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{dayDate.getFullYear()}</span></>
              ) : (
                <>{HOUR_LABELS.length > 0 && weekDays[0] && `${weekDays[0].getDate()} ${monthNames[weekDays[0].getMonth()].slice(0,3)}`} - {weekDays[6] && `${weekDays[6].getDate()} ${monthNames[weekDays[6].getMonth()].slice(0,3)} ${weekDays[6].getFullYear()}`}</>
              )}
            </h3>
            {gcalConnected && (
              <span style={{ fontSize: '9px', color: '#4285F4', background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.3)', padding: '2px 8px', borderRadius: '8px', fontWeight: 700, letterSpacing: '0.04em' }}>
                GOOGLE ✓
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button className="outline-action-btn" onClick={goToday} style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, borderRadius: '8px' }}>
              Hoy
            </button>
            <button className="outline-action-btn" onClick={handlePrevMonth} style={{ padding: '6px', borderRadius: '8px' }}>
              <ChevronLeft size={16} />
            </button>
            <button className="outline-action-btn" onClick={handleNextMonth} style={{ padding: '6px', borderRadius: '8px' }}>
              <ChevronRight size={16} />
            </button>
            <div style={{ display: 'flex', gap: '2px', marginLeft: '6px', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setView('day')}
                title="Vista diaria"
                style={{
                  border: 'none', cursor: 'pointer', borderRadius: '6px', padding: '4px 8px',
                  background: view === 'day' ? 'var(--accent-green)' : 'transparent',
                  color: view === 'day' ? '#031b0f' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700
                }}
              >
                <CalendarDays size={13} /> Día
              </button>
              <button
                onClick={() => setView('month')}
                title="Vista mensual"
                style={{
                  border: 'none', cursor: 'pointer', borderRadius: '6px', padding: '4px 8px',
                  background: view === 'month' ? 'var(--accent-green)' : 'transparent',
                  color: view === 'month' ? '#031b0f' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700
                }}
              >
                <LayoutGrid size={13} /> Mes
              </button>
              <button
                onClick={() => setView('week')}
                title="Vista semanal"
                style={{
                  border: 'none', cursor: 'pointer', borderRadius: '6px', padding: '4px 8px',
                  background: view === 'week' ? 'var(--accent-green)' : 'transparent',
                  color: view === 'week' ? '#031b0f' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700
                }}
              >
                <List size={13} /> Semana
              </button>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                background: '#FFA726',
                border: 'none',
                borderRadius: '8px',
                color: '#111827',
                padding: '6px 14px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: '6px',
                boxShadow: '0 0 10px rgba(255, 167, 38, 0.4)',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={14} /> Nuevo Evento
            </button>
          </div>
        </div>

        {view === 'month' && (<>
        {/* Days of week header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-subtle)', letterSpacing: '0.06em', marginBottom: '6px' }}>
          <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
        </div>

        {/* Grid Cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {/* Empty leading cells (si el mes empieza en domingo, 0; lunes offset para cuadrar con la cabecera) */}
          {[...Array((firstDayIndex + 6) % 7)].map((_, i) => (
            <div key={`empty-${i}`} style={{ minHeight: '92px', background: 'transparent' }} />
          ))}

          {/* Days of the month */}
          {[...Array(daysInMonth)].map((_, i) => {
            const dayNum = i + 1;
            const dayStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
            const isSelected = selectedDateStr === dayStr;
            const isToday = todayStr === dayStr;
            const dayEvents = aggregatedEvents.filter(e => e.start.split('T')[0] === dayStr);
            const visible = dayEvents.slice(0, 3);

            return (
              <div
                key={`day-${dayNum}`}
                onClick={() => setSelectedDateStr(dayStr)}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={e => handleDropOnDay(e, dayStr)}
                style={{
                  minHeight: '92px',
                  background: isSelected ? 'rgba(22,240,181,0.07)' : (isToday ? 'rgba(22,240,181,0.045)' : 'var(--bg-secondary)'),
                  border: isSelected ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                  borderTop: isToday ? '3px solid var(--accent-green)' : '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '5px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  transition: 'all 0.12s ease',
                  overflow: 'hidden'
                }}
              >
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: isToday ? 800 : 600,
                  color: isToday ? '#031b0f' : 'var(--text-secondary)',
                  background: isToday ? 'var(--accent-green)' : 'transparent',
                  width: '20px', height: '20px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  alignSelf: 'flex-start'
                }}>
                  {dayNum}
                </span>

                {/* Event chips (Google style) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                  {visible.map(e => (
                    <div
                      key={e.id}
                      title={`${fmtTime(e.start) ? fmtTime(e.start) + ' · ' : ''}${e.title}`}
                      draggable
                      onDragStart={ev => handleDragStart(ev, e)}
                      onDragEnd={() => setDraggingEvent(null)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: `${e.color}22`,
                        borderLeft: `3px solid ${e.color}`,
                        borderRadius: '3px',
                        padding: '1px 4px',
                        fontSize: '0.58rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.4,
                        cursor: 'grab'
                      }}
                    >
                      {!e.allDay && fmtTime(e.start) && (
                        <span style={{ color: e.color, fontWeight: 800, flexShrink: 0 }}>{fmtTime(e.start)}</span>
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title.replace(/^[^\s]+\s/, '')}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-subtle)', paddingLeft: '2px', fontWeight: 600 }}>
                      +{dayEvents.length - 3} más
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </>)}

        {/* Day / Week View */}
        {view !== 'month' && (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Day / week day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: `32px repeat(${timelineCols}, 1fr)`, gap: '2px' }}>
            <span />
            {timelineDays.map(d => {
              const dStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
              const isToday = todayStr === dStr;
              const isSelected = selectedDateStr === dStr;
              const weekdayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
              return (
                <div key={dStr} onClick={() => setSelectedDateStr(dStr)} style={{
                  textAlign: 'center', cursor: 'pointer', padding: '2px 0',
                  background: isSelected ? 'rgba(22,240,181,0.1)' : 'transparent',
                  borderRadius: '6px'
                }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase' }}>{weekdayNames[(d.getDay() + 6) % 7]}</div>
                  <div style={{
                    fontSize: '0.8rem', fontWeight: 700, width: '24px', height: '24px', margin: '0 auto',
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isToday ? '#031b0f' : 'var(--text-primary)',
                    background: isToday ? 'var(--accent-green)' : 'transparent'
                  }}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>

          {/* Time grid: 24 h × N days */}
          <div style={{ display: 'grid', gridTemplateColumns: `32px repeat(${timelineCols}, 1fr)`, gap: '2px', fontSize: '0.6rem', color: 'var(--text-subtle)', overflowY: 'auto', maxHeight: '420px' }}>
            {/* hour labels column */}
            <div style={{ position: 'relative', height: `${HOUR_LABELS.length * HOUR_PX}px` }}>
              {HOUR_LABELS.map((h, idx) => (
                <div key={idx} style={{ position: 'absolute', top: `${idx * HOUR_PX - 6}px`, right: '4px' }}>{h}</div>
              ))}
            </div>

            {/* day columns */}
            {timelineDays.map(d => {
              const dbStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
              const dayEvents = aggregatedEvents
                .filter(e => e.start.split('T')[0] === dbStr)
                .filter(e => !e.allDay);
              const dayAllDay = aggregatedEvents.filter(e => e.start.split('T')[0] === dbStr && e.allDay);

              return (
                <div
                  key={dbStr}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={e => handleDropOnTime(e, dbStr)}
                  style={{ position: 'relative', height: `${HOUR_LABELS.length * HOUR_PX}px`, borderLeft: '1px solid var(--border-color)' }}
                >
                  {/* hour lines */}
                  {HOUR_LABELS.map((_, idx) => (
                    <div key={idx} style={{ position: 'absolute', left: 0, right: 0, top: `${idx * HOUR_PX - 0.5}px`, height: '1px', background: 'var(--border-color)', opacity: 0.5 }} />
                  ))}

                  {/* all-day events pinned at top */}
                  {dayAllDay.map(e => (
                    <div
                      key={e.id}
                      title={e.title}
                      onClick={() => setSelectedDateStr(dbStr)}
                      draggable
                      onDragStart={ev => handleDragStart(ev, e)}
                      onDragEnd={() => setDraggingEvent(null)}
                      style={{
                        position: 'absolute', left: 2, right: 2, top: 2, zIndex: 2,
                        background: `${e.color}26`, borderLeft: `3px solid ${e.color}`, borderRadius: '3px',
                        padding: '0 3px', fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'grab'
                      }}
                    >
                      {e.title.replace(/^[^\s]+\s/, '').slice(0, 30)}
                    </div>
                  ))}

                  {/* timed events positioned on the timeline */}
                  {dayEvents.map(e => {
                    const t = e.start.split('T')[1] || '00:00:00';
                    const [hh, mm] = t.split(':').map(Number);
                    const minutes = hh * 60 + mm;
                    const top = (minutes / 60) * HOUR_PX;
                    const duration = (e.source === 'health' ? 60 : 30);
                    const height = Math.max(HOUR_PX / 2, (duration / 60) * HOUR_PX);
                    return (
                      <div
                        key={e.id}
                        onClick={() => setSelectedDateStr(dbStr)}
                        draggable
                        onDragStart={ev => handleDragStart(ev, e)}
                        onDragEnd={() => setDraggingEvent(null)}
                        style={{
                          position: 'absolute', left: 2, right: 2, top, height, zIndex: 1,
                          background: `${e.color}2b`, borderLeft: `3px solid ${e.color}`,
                          borderRadius: '3px', padding: '1px 3px',
                          fontSize: '0.55rem', fontWeight: 600, color: 'var(--text-primary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'grab'
                        }}
                      >
                        {fmtTime(e.start) && <span style={{ fontWeight: 800, color: e.color }}>{fmtTime(e.start)} </span>}
                        {e.title.replace(/^[^\s]+\s/, '').slice(0, 28)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        </>)}
      </div>

      {/* Daily Agenda below calendar (full width) */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Agenda del día
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 600 }}>
            {isSelectedToday ? 'Hoy · ' : ''}{selectedDateStr.split('-').reverse().join('/')}
          </span>
        </div>

        {selectedDayEvents.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', textAlign: 'center', marginTop: '20px' }}>
            Sin eventos para este día.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '8px' }}>
            {selectedDayEvents.map(e => (
              <div
                key={e.id}
                draggable
                onDragStart={ev => handleDragStart(ev, e)}
                onDragEnd={() => setDraggingEvent(null)}
                style={{
                  padding: '8px 10px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderLeft: `3px solid ${e.color}`,
                  borderRadius: '8px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                  cursor: 'grab',
                  position: 'relative'
                }}
              >
                <button
                  onClick={ev => { ev.stopPropagation(); deleteEvent(e); }}
                  title="Eliminar evento"
                  style={{
                    position: 'absolute', top: '6px', right: '6px', background: 'transparent',
                    border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: '2px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '4px'
                  }}
                  onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.color = '#EF4444'}
                  onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.color = 'var(--text-subtle)'}
                >
                  <Trash2 size={13} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0, width: '34px', paddingRight: '18px' }}>
                  {getSourceIcon(e.source, e.color)}
                  {!e.allDay && e.start && e.start.split('T')[1] && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {e.start.split('T')[1].slice(0, 5)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.title.replace(/^[^\s]+\s/, '')}
                  </span>
                  {e.description && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.description}
                    </span>
                  )}
                  {e.meta?.location && (
                    <span style={{ fontSize: '0.68rem', color: '#4285F4', fontWeight: 600 }}>📍 {e.meta.location}</span>
                  )}
                  {e.meta?.profileName && (
                    <span style={{ fontSize: '0.68rem', color: '#EF4444', fontWeight: 600 }}>Paciente: {e.meta.profileName}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Crear Nuevo Evento */}
        {showAddModal && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '10px',
            padding: '20px',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#FFA726' }}>
                Nuevo Evento ({selectedDateStr.split('-').reverse().join('/')})
              </h4>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '4px' }}>Título del Evento</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={e => setNewEventTitle(e.target.value)}
                  placeholder="ej. Reunión de Equipo / Cita Médica"
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '4px' }}>Etiqueta / Categoría</label>
                <select
                  value={newEventTag}
                  onChange={e => setNewEventTag(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                >
                  <option value="Trabajo">Trabajo</option>
                  <option value="Personal">Personal</option>
                  <option value="Clientes">Clientes</option>
                  <option value="Sistema">Sistema</option>
                  <option value="Estudio">Estudio</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', color: '#ccc', padding: '8px', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, background: '#FFA726', border: 'none', borderRadius: '6px', color: '#111827', padding: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Guardar Evento
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

    </div>
  );
};
export default CalendarModule;
