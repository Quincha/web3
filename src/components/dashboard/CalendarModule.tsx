import React, { useState, useMemo } from 'react';
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Stethoscope, CheckSquare, Clock, BookOpen } from 'lucide-react';
import { useHealth } from '../../context/HealthContext';
import { useTasks } from '../../context/TasksContext';
import { usePomodoro } from '../../context/PomodoroContext';
import { useBujo } from '../../context/BujoContext';

type EventSource = 'health' | 'tasks' | 'pomodoro' | 'bujo';

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
  };
}

export const CalendarModule: React.FC = () => {
  const { appointments, profiles } = useHealth();
  const { tasks, projects } = useTasks();
  const { completedSessions } = usePomodoro();
  const { entries } = useBujo();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(new Date().toISOString().split('T')[0]);

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

    // 4. Bullet Journal Daily Logs
    entries.forEach(entry => {
      list.push({
        id: `cal_bujo_${entry.id}`,
        source: 'bujo',
        sourceId: entry.id,
        title: `📓 Bujo: ${entry.content}`,
        description: `Tipo: ${entry.type}`,
        start: `${entry.date}T12:00:00`,
        allDay: true,
        color: '#9CA3AF'
      });
    });

    return list;
  }, [appointments, tasks, completedSessions, entries, projects, profiles]);

  // Calendar math helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday...

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Filter events for active selected day details
  const selectedDayEvents = useMemo(() => {
    return aggregatedEvents.filter(e => {
      const eDate = e.start.split('T')[0];
      return eDate === selectedDateStr;
    });
  }, [aggregatedEvents, selectedDateStr]);

  const getSourceIcon = (source: EventSource) => {
    switch (source) {
      case 'health':   return <Stethoscope size={14} style={{ color: '#EF4444' }} />;
      case 'tasks':    return <CheckSquare size={14} style={{ color: '#3B82F6' }} />;
      case 'pomodoro': return <Clock size={14} style={{ color: '#F97316' }} />;
      default:         return <BookOpen size={14} style={{ color: '#9CA3AF' }} />;
    }
  };

  return (
    <div className="calendar-module-container" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
      
      {/* Left Column: Monthly View Grid */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
            {monthNames[month]} {year}
          </h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="outline-action-btn" onClick={handlePrevMonth} style={{ padding: '6px' }}>
              <ChevronLeft size={16} />
            </button>
            <button className="outline-action-btn" onClick={handleNextMonth} style={{ padding: '6px' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '8px' }}>
          <span>DOM</span><span>LUN</span><span>MAR</span><span>MIÉ</span><span>JUE</span><span>VIE</span><span>SÁB</span>
        </div>

        {/* Grid Cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {/* Empty placeholders before first day */}
          {[...Array(firstDayIndex)].map((_, i) => (
            <div key={`empty-${i}`} style={{ height: '70px', background: 'transparent' }} />
          ))}

          {/* Days of the month */}
          {[...Array(daysInMonth)].map((_, i) => {
            const dayNum = i + 1;
            const dayStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
            const isSelected = selectedDateStr === dayStr;
            const dayEvents = aggregatedEvents.filter(e => e.start.split('T')[0] === dayStr);

            return (
              <div
                key={`day-${dayNum}`}
                onClick={() => setSelectedDateStr(dayStr)}
                style={{
                  height: '70px',
                  background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-secondary)',
                  border: `1px solid ${isSelected ? 'var(--accent-green)' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isSelected ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                  {dayNum}
                </span>

                {/* Event indicators */}
                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', overflow: 'hidden', height: '24px' }}>
                  {dayEvents.slice(0, 3).map(e => (
                    <div
                      key={e.id}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: e.color
                      }}
                      title={e.title}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-subtle)', lineHeight: 1 }}>
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Daily Agenda list details */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          Agenda para el {selectedDateStr.split('-').reverse().join('/')}
        </h3>

        {selectedDayEvents.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', textAlign: 'center', marginTop: '20px' }}>
            No hay eventos programados para este día.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '400px' }}>
            {selectedDayEvents.map(e => (
              <div
                key={e.id}
                style={{
                  padding: '10px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ marginTop: '2px' }}>{getSourceIcon(e.source)}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{e.title}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{e.description}</span>
                  {e.meta?.profileName && (
                    <span style={{ fontSize: '0.7rem', color: '#EF4444', fontWeight: 600 }}>Paciente: {e.meta.profileName}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
export default CalendarModule;
