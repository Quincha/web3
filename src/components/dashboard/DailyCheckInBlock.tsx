import React, { useState, useEffect } from 'react';
import { useBujo } from '../../context/BujoContext';
import type { BujoCheckIn } from '../../context/BujoContext';
import { useHabits } from '../../context/HabitsContext';
import { Star, Zap, Check, X, Sparkles, MessageSquare } from 'lucide-react';

interface DailyCheckInBlockProps {
  selectedDateStr: string;
}

export const DailyCheckInBlock: React.FC<DailyCheckInBlockProps> = ({ selectedDateStr }) => {
  const { getCheckIn, saveCheckIn, addOrUpdateReflectionEntry } = useBujo();
  const { habits, setHabitStateForDate } = useHabits();

  const currentCheckIn = (getCheckIn(selectedDateStr) || {}) as Partial<BujoCheckIn>;

  const [dayRating, setDayRating] = useState<number>(currentCheckIn.dayRating || 0);
  const [energyLevel, setEnergyLevel] = useState<number>(currentCheckIn.energyLevel || 7);
  const [notes, setNotes] = useState<string>(currentCheckIn.notes || '');

  // Synchronize internal component state whenever selectedDateStr changes
  useEffect(() => {
    const c = (getCheckIn(selectedDateStr) || {}) as Partial<BujoCheckIn>;
    setDayRating(c.dayRating || 0);
    setEnergyLevel(c.energyLevel || 7);
    setNotes(c.notes || '');
  }, [selectedDateStr, getCheckIn]);

  // Dynamic habit toggle handler
  const handleHabitToggle = (habitId: string, completed: boolean, isViolation: boolean = false, note?: string) => {
    setHabitStateForDate(habitId, selectedDateStr, completed, isViolation, note);
  };

  const handleRatingChange = (stars: number) => {
    setDayRating(stars);
    saveCheckIn({ date: selectedDateStr, dayRating: stars });
  };

  const handleEnergyChange = (val: number) => {
    setEnergyLevel(val);
    saveCheckIn({ date: selectedDateStr, energyLevel: val });
  };



  const handleNotesChange = (txt: string) => {
    setNotes(txt);
    saveCheckIn({ date: selectedDateStr, notes: txt });
    addOrUpdateReflectionEntry(selectedDateStr, txt);
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px'
    }}>
      {/* Header Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="#2DD4BF" style={{ filter: 'drop-shadow(0 0 6px rgba(45, 212, 191, 0.5))' }} />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.01em' }}>
            Check-in Diario & Evaluación
          </h3>
        </div>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
          Sincronizado con Hábitos y Salud
        </span>
      </div>

      {/* Row 1: Calidad del Día (Estrellas) + Estado de Ánimo / Energía (Slider 1-10) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Calidad del Día */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Calidad del Día
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRatingChange(star)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Star
                  size={20}
                  fill={star <= dayRating ? '#F59E0B' : 'transparent'}
                  color={star <= dayRating ? '#FBBF24' : 'rgba(255,255,255,0.25)'}
                  style={{ filter: star <= dayRating ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))' : 'none' }}
                />
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: dayRating > 0 ? '#FBBF24' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
              {dayRating === 5 ? '¡Excelente!' : dayRating === 4 ? 'Muy Bueno' : dayRating === 3 ? 'Normal' : dayRating === 2 ? 'Regular' : dayRating === 1 ? 'Malo' : 'Sin evaluar'}
            </span>
          </div>
        </div>

        {/* Estado de Ánimo / Energía (1-10) */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={13} color="#2DD4BF" />
              Ánimo & Energía
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#2DD4BF', filter: 'drop-shadow(0 0 4px rgba(45, 212, 191, 0.5))' }}>
              {energyLevel} / 10
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={energyLevel}
            onChange={(e) => handleEnergyChange(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: '#2DD4BF',
              cursor: 'pointer',
              height: '6px',
              borderRadius: '3px'
            }}
          />
        </div>
      </div>

      {/* Row 2: Cuestionario de Rutina Diaria (Toggle Buttons) */}
      <div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Seguimiento de Rutinas (Sincronización de Hábitos)
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          
          {/* Render Active Habits dynamically */}
          {habits.filter(h => !h.archived).map(habit => {
            const completion = habit.completions.find(c => c.date === selectedDateStr);
            const isCompleted = !!completion;
            const isNegative = habit.type === 'negative';
            const isViolation = completion?.isViolation === true;
            
            // For negative habits:
            // "No (Limpio)" means completed=true, isViolation=false
            // "Sí (Consumo)" means completed=true, isViolation=true
            // Not registered means completed=false
            
            const isCleanDay = isNegative && isCompleted && !isViolation;
            const isFailedDay = isNegative && isCompleted && isViolation;

            return (
              <div key={habit.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#E2E8F0', fontWeight: 500 }} title={habit.description}>
                  <span style={{ fontSize: '15px' }}>{habit.icon}</span>
                  {habit.name}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {!isNegative ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleHabitToggle(habit.id, true)}
                        style={{
                          background: isCompleted ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isCompleted ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
                          color: isCompleted ? '#34D399' : 'rgba(255,255,255,0.5)',
                          borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                          boxShadow: isCompleted ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none'
                        }}
                      >
                        <Check size={12} /> Sí
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHabitToggle(habit.id, false)}
                        style={{
                          background: !isCompleted && completion !== undefined ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${!isCompleted && completion !== undefined ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                          color: !isCompleted && completion !== undefined ? '#F87171' : 'rgba(255,255,255,0.5)',
                          borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <X size={12} /> No
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleHabitToggle(habit.id, true, false, 'Día limpio')}
                        title="Día Limpio (Suma racha positiva)"
                        style={{
                          background: isCleanDay ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isCleanDay ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
                          color: isCleanDay ? '#34D399' : 'rgba(255,255,255,0.5)',
                          borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                          boxShadow: isCleanDay ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none'
                        }}
                      >
                        <Check size={12} /> No (Limpio)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHabitToggle(habit.id, true, true, 'Interrupción de racha')}
                        title="Consumo (Interrumpe racha)"
                        style={{
                          background: isFailedDay ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isFailedDay ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                          color: isFailedDay ? '#F87171' : 'rgba(255,255,255,0.5)',
                          borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                          boxShadow: isFailedDay ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none'
                        }}
                      >
                        <X size={12} /> Sí
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {/* Row 3: Reflexión / Notas Rápidas con Botón y Enter */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          saveCheckIn({ date: selectedDateStr, notes });
          addOrUpdateReflectionEntry(selectedDateStr, notes);
          const btn = e.currentTarget.querySelector('button');
          if (btn) {
            btn.innerText = '¡Guardado! ✓';
            setTimeout(() => { btn.innerText = 'Guardar'; }, 2000);
          }
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <MessageSquare size={13} color="rgba(255,255,255,0.5)" />
            Reflexión o Nota del Día
          </div>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
            Presiona <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}>Enter ↵</kbd> o clic en Guardar
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Escribe una reflexión corta o lo mejor de tu día..."
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#FFFFFF',
              fontSize: '13px',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#2DD4BF'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <button
            type="submit"
            style={{
              background: 'rgba(45, 212, 191, 0.15)',
              border: '1px solid rgba(45, 212, 191, 0.4)',
              color: '#2DD4BF',
              borderRadius: '10px',
              padding: '0 18px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              boxShadow: '0 0 12px rgba(45, 212, 191, 0.2)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(45, 212, 191, 0.25)';
              e.currentTarget.style.borderColor = '#2DD4BF';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(45, 212, 191, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(45, 212, 191, 0.4)';
            }}
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
};
