import React from 'react';
import { ChevronDown, Dumbbell, Book, Sparkles, Droplet, Check } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';
import { tokens } from '../theme/tokens';

export const HabitsWidget: React.FC = () => {
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const habits = [
    { id: 1, name: 'Ejercicio', icon: <Dumbbell size={10} />, color: tokens.colors.accent.green, progress: 0.71, streak: 5, checks: [true, true, true, true, true, false, false] },
    { id: 2, name: 'Lectura', icon: <Book size={10} />, color: tokens.colors.accent.cyan, progress: 0.42, streak: 3, checks: [true, false, true, true, false, false, false] },
    { id: 3, name: 'Meditación', icon: <Sparkles size={10} />, color: '#B388FF', progress: 1.0, streak: 7, checks: [true, true, true, true, true, true, true] },
    { id: 4, name: 'Hidratación', icon: <Droplet size={10} />, color: tokens.colors.accent.cyan, progress: 0.28, streak: 2, checks: [true, true, false, false, false, false, false] },
  ];

  return (
    <div className="premium-card-hover" style={{
      background: 'rgba(15, 23, 42, 0.3)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '24px',
      padding: '24px',
      border: `1px solid rgba(179, 136, 255, 0.15)`,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
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
            {days.map((day, i) => (
              <span key={i} style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 700, width: '22px', textAlign: 'center' }}>
                {day}
              </span>
            ))}
          </div>
        </div>

        {/* Habits Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {habits.map((habit) => (
            <div key={habit.id} style={{ 
              display: 'flex', 
              alignItems: 'center',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '8px 10px',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}>
              
              {/* Info Column */}
              <div style={{ display: 'flex', alignItems: 'center', width: '130px', gap: '10px' }}>
                {/* Mini Progress Ring */}
                <div style={{ position: 'relative', width: '28px', height: '28px', flexShrink: 0 }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="14" cy="14" r="12" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
                    <circle cx="14" cy="14" r="12" fill="none" stroke={habit.color} strokeWidth="2.5" strokeLinecap="round" 
                      strokeDasharray="75.4" strokeDashoffset={75.4 - (75.4 * habit.progress)}
                      style={{ filter: `drop-shadow(0 0 4px ${habit.color}80)` }} />
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: habit.color }}>
                    {habit.icon}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{habit.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 500 }}>{habit.streak} días racha</span>
                </div>
              </div>

              {/* Checkmarks Column */}
              <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between', padding: '0 8px' }}>
                {habit.checks.map((checked, i) => (
                  <div key={i} style={{
                    width: '20px', height: '20px',
                    borderRadius: '50%',
                    background: checked ? `${habit.color}15` : 'rgba(0,0,0,0.3)',
                    border: checked ? `1px solid ${habit.color}50` : '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: checked ? `0 0 8px ${habit.color}30` : 'none',
                    transition: 'all 0.2s ease',
                  }}>
                    {checked && <Check size={12} color={habit.color} style={{ filter: `drop-shadow(0 0 4px ${habit.color})` }} />}
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
