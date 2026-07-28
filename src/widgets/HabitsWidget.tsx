import React from 'react';
import { ChevronDown, Dumbbell, Book, Sparkles, Droplet, Check } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';
import { tokens } from '../theme/tokens';

const HabitsWidget: React.FC = () => {
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const habits = [
    { id: 1, name: 'Ejercicio', icon: <Dumbbell size={14} />, color: tokens.colors.accent.green, streak: 5, checks: [true, true, true, true, true, false, false] },
    { id: 2, name: 'Lectura', icon: <Book size={14} />, color: tokens.colors.accent.cyan, streak: 3, checks: [true, false, true, true, false, false, false] },
    { id: 3, name: 'Meditación', icon: <Sparkles size={14} />, color: '#B388FF', streak: 7, checks: [true, true, true, true, true, true, true] },
    { id: 4, name: 'Hidratación', icon: <Droplet size={14} />, color: tokens.colors.accent.cyan, streak: 2, checks: [true, true, false, false, false, false, false] },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.space6 }}>
        <h3 style={{ fontSize: tokens.typography.sizes.title, fontWeight: tokens.typography.weights.medium, color: tokens.colors.text.primary }}>
          Hábitos
        </h3>
        <button style={{ 
          background: 'transparent', 
          border: 'none', 
          color: tokens.colors.text.secondary, 
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.space1,
          fontSize: tokens.typography.sizes.small
        }}>
          Esta semana <ChevronDown size={14} />
        </button>
      </div>

      <div style={{ flex: 1, overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: tokens.spacing.space2 }}>
          <div style={{ width: '100px' }}></div> {/* Empty space for habit name */}
          <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between', padding: `0 ${tokens.spacing.space4}` }}>
            {days.map((day, i) => (
              <span key={i} style={{ color: tokens.colors.text.muted, fontSize: tokens.typography.sizes.caption, width: '20px', textAlign: 'center' }}>
                {day}
              </span>
            ))}
          </div>
          <div style={{ width: '60px' }}></div> {/* Empty space for streak */}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.space3 }}>
          {habits.map(habit => (
            <div key={habit.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.space2, width: '100px' }}>
                <div style={{ color: habit.color }}>{habit.icon}</div>
                <span style={{ color: tokens.colors.text.primary, fontSize: tokens.typography.sizes.small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {habit.name}
                </span>
              </div>

              <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between', padding: `0 ${tokens.spacing.space4}` }}>
                {habit.checks.map((checked, i) => (
                  <div key={i} style={{ 
                    width: '22px', 
                    height: '22px', 
                    borderRadius: '50%', 
                    background: checked ? `linear-gradient(135deg, ${habit.color}, ${habit.color}80)` : 'rgba(255, 255, 255, 0.05)',
                    border: checked ? 'none' : `1px solid rgba(255, 255, 255, 0.1)`,
                    boxShadow: checked ? `0 0 8px ${habit.color}60` : 'inset 0 2px 4px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: tokens.colors.background.primary
                  }}>
                    {checked && <Check size={14} strokeWidth={3} />}
                  </div>
                ))}
              </div>

              <div style={{ width: '60px', textAlign: 'right' }}>
                <span style={{ 
                  color: tokens.colors.text.secondary, 
                  fontSize: tokens.typography.sizes.caption,
                  background: tokens.colors.background.hover,
                  padding: '2px 6px',
                  borderRadius: tokens.radius.pill
                }}>
                  {habit.streak} racha
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Register widget
WidgetRegistry.register({
  id: 'habitos',
  name: 'Hábitos',
  description: 'Seguimiento de hábitos diarios y semanales.',
  defaultSize: 'medium',
  component: HabitsWidget
});

export default HabitsWidget;
