import React, { useState } from 'react';
import { Plus, Check, Trophy, Star, Calendar, Trash2, Archive, Flame } from 'lucide-react';
import { useHabits } from '../../context/HabitsContext';
import type { HabitWithStats, HabitFrequency } from '../../context/HabitsContext';

export const HabitsModule: React.FC = () => {
  const { habitsWithStats, addHabit, toggleHabitToday, archiveHabit } = useHabits();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [icon, setIcon] = useState('🔥');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [color, setColor] = useState('#10B981');

  const EMOJIS = ['🔥', '💧', '🏃', '📚', '🧘', '🚭', '🍎', '💻', '⏰', '✍️'];
  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let targetDays = [0, 1, 2, 3, 4, 5, 6];
    if (frequency === 'weekdays') targetDays = [1, 2, 3, 4, 5];
    if (frequency === 'weekends') targetDays = [0, 6];

    addHabit({
      name: name.trim(),
      description: desc.trim(),
      icon,
      color,
      frequency,
      targetDays,
      startDate: new Date().toISOString().split('T')[0],
      archived: false,
    });

    setName('');
    setDesc('');
    setShowAddForm(false);
  };

  return (
    <div className="habits-module-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="module-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Hábitos & Rutinas</h2>
          <p className="module-subtitle">Construye consistencia día a día</p>
        </div>
        <button className="action-green-btn" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={14} /> Nuevo Hábito
        </button>
      </div>

      {showAddForm && (
        <div className="add-task-form-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              type="text"
              className="task-form-input task-form-title-input"
              placeholder="Nombre del hábito (ej: Meditar, Beber agua)..."
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <input
              type="text"
              className="task-form-input"
              placeholder="Descripción (opcional)..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
            
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '6px' }}>Icono</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setIcon(em)}
                      style={{
                        padding: '6px 10px',
                        background: icon === em ? 'var(--bg-input-focus)' : 'transparent',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '6px' }}>Color</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{
                        width: '24px',
                        height: '24px',
                        background: c,
                        border: color === c ? '2px solid var(--text-primary)' : 'none',
                        borderRadius: '50%',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '6px' }}>Frecuencia</label>
                <select
                  className="task-form-select"
                  value={frequency}
                  onChange={e => setFrequency(e.target.value as HabitFrequency)}
                >
                  <option value="daily">Diario</option>
                  <option value="weekdays">Días de semana</option>
                  <option value="weekends">Fines de semana</option>
                </select>
              </div>
            </div>

            <div className="task-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="outline-action-btn" onClick={() => setShowAddForm(false)}>Cancelar</button>
              <button type="submit" className="action-green-btn">Crear Hábito</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {habitsWithStats.map(habit => (
          <div
            key={habit.id}
            style={{
              background: 'var(--bg-card)',
              border: `1px solid ${habit.completedToday ? habit.color + '40' : 'var(--border-color)'}`,
              borderRadius: '10px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>{habit.icon}</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{habit.name}</h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-subtle)' }}>{habit.description}</p>
                </div>
              </div>
              <button
                onClick={() => toggleHabitToday(habit.id)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  background: habit.completedToday ? habit.color : 'var(--bg-secondary)',
                  color: habit.completedToday ? '#FFF' : 'var(--text-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <Check size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flame size={14} style={{ color: habit.streak > 0 ? '#F97316' : 'var(--text-subtle)' }} />
                <span>Racha: <strong>{habit.streak}d</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Trophy size={14} style={{ color: '#F59E0B' }} />
                <span>Máx: <strong>{habit.bestStreak}d</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={14} style={{ color: habit.color }} />
                <span>Tasa 30d: <strong>{habit.completionRate30d}%</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
              <button
                onClick={() => archiveHabit(habit.id)}
                title="Archivar"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: '4px' }}
              >
                <Archive size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
