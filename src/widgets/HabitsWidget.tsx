import React from 'react';
import { ChevronDown, ArrowRight, Check } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';
import { tokens } from '../theme/tokens';
import { useHabits, type HabitWithStats } from '../context/HabitsContext';

const HABIT_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MAX_HABITS = 6;

interface WeekDay {
  label: string;
  iso: string;
  isToday: boolean;
}

function getLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getThisWeekDays(): WeekDay[] {
  const today = new Date();
  const weekStart = new Date(today);
  const day = today.getDay();
  weekStart.setDate(today.getDate() - ((day + 6) % 7));
  const todayIso = getLocalISO(today);

  return HABIT_LABELS.map((label, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const iso = getLocalISO(d);
    return { label, iso, isToday: iso === todayIso };
  });
}

// Shared ring geometry helpers
const CIRCUMFERENCE = 75.4;

export const HabitsWidget: React.FC = () => {
  const { habitsWithStats, toggleHabitForDate } = useHabits();
  const activeHabits = habitsWithStats.filter(h => !h.archived).slice(0, MAX_HABITS);
  const weekDays = getThisWeekDays();

  return (
    <div className="dashboard-card">
      {/* Background orb */}
      <div style={{
        position: 'absolute', bottom: '-50px', left: '-50px',
        width: '180px', height: '180px',
        background: 'radial-gradient(circle, rgba(179, 136, 255, 0.15) 0%, rgba(0,0,0,0) 70%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0
      }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '0.1em', margin: 0 }}>
          HÁBITOS (BUJO)
        </h3>
        <button style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '12px'
        }}>
          Esta semana <ChevronDown size={14} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>

        {/* Days Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px' }}>
          <div style={{ width: '130px' }}></div>
          <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between', padding: '0 8px' }}>
            {weekDays.map((day, i) => (
              <span key={i} style={{
                color: day.isToday ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: '10px', fontWeight: 700, width: '22px', textAlign: 'center'
              }}>
                {day.label}
              </span>
            ))}
          </div>
        </div>

        {/* Habits Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeHabits.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>
              Aún no tienes hábitos. Crea uno en el módulo Hábitos.
            </div>
          ) : (
            activeHabits.map(habit => (
              <HabitRow key={habit.id} habit={habit} weekDays={weekDays} onToggle={toggleHabitForDate} />
            ))
          )}
        </div>
      </div>

      {/* Footer link */}
      <div style={{ marginTop: '16px', borderTop: `1px solid ${tokens.colors.border.primary}`, paddingTop: '12px', zIndex: 1 }}>
        <a
          href="#"
          onClick={e => {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('change-view', { detail: 'habitos' }));
            window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: 'habitos' }));
          }}
          style={{ color: tokens.colors.accent.green, fontSize: '12px', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          Ver todos los hábitos <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
};

const HabitRow: React.FC<{ habit: HabitWithStats; weekDays: WeekDay[]; onToggle: (id: string, iso: string, isViolation: boolean) => void }> = ({ habit, weekDays, onToggle }) => {
  const progress = (habit.completionRate30d || 0) / 100;
  const isNegative = habit.type === 'negative';

  const isChecked = (iso: string) => habit.completions.some(c => c.date === iso);

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '12px', padding: '8px 10px', transition: 'all 0.3s ease'
    }}>

      {/* Info Column */}
      <div style={{ display: 'flex', alignItems: 'center', width: '130px', gap: '10px' }}>
        {/* Mini Progress Ring */}
        <div style={{ position: 'relative', width: '28px', height: '28px', flexShrink: 0 }}>
          <svg width="28" height="28" viewBox="0 0 28 28" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="14" cy="14" r="12" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
            <circle cx="14" cy="14" r="12" fill="none" stroke={habit.color} strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE - (CIRCUMFERENCE * progress)}
              style={{ filter: `drop-shadow(0 0 4px ${habit.color}80)` }} />
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
            {habit.icon}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{habit.name}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 500 }}>
            {`${habit.streak} días de racha`}
          </span>
        </div>
      </div>

      {/* Checkmarks Column */}
      <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between', padding: '0 8px' }}>
        {weekDays.map((day, i) => {
          const checked = isChecked(day.iso);
          return (
            <button
              key={i}
              onClick={() => onToggle(habit.id, day.iso, isNegative)}
              title={`${habit.name} · ${day.iso}`}
              style={{
                width: '20px', height: '20px',
                borderRadius: '50%', cursor: 'pointer', padding: 0,
                background: checked ? `${habit.color}15` : 'rgba(0,0,0,0.3)',
                border: checked ? `1px solid ${habit.color}50` : `1px solid ${day.isToday ? habit.color + '55' : 'rgba(255,255,255,0.08)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: checked ? `0 0 8px ${habit.color}30` : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {checked && <Check size={12} color={habit.color} style={{ filter: `drop-shadow(0 0 4px ${habit.color})` }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Register widget
WidgetRegistry.register({
  id: 'habits',
  name: 'Hábitos (BuJo)',
  description: 'Tracker semanal de hábitos con días L M M J V S D.',
  defaultSize: 'small',
  component: HabitsWidget
});

export default HabitsWidget;