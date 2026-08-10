import React, { useState } from 'react';
import { Plus, Check, Trophy, Star, Calendar, Trash2, Pencil, Flame, Ban } from 'lucide-react';
import { useHabits } from '../../context/HabitsContext';
import type { HabitWithStats, HabitFrequency, HabitType } from '../../context/HabitsContext';

export const HabitsModule: React.FC = () => {
  const { habitsWithStats, addHabit, updateHabit, deleteHabit, toggleHabitToday } = useHabits();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [icon, setIcon] = useState('🔥');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [customDays, setCustomDays] = useState<number[]>([1]);
  const [color, setColor] = useState('#10B981');
  const [type, setType] = useState<HabitType>('positive');

  const EMOJIS = ['🔥', '💧', '🏃', '📚', '🧘', '🚭', '🍎', '💻', '⏰', '✍️', '🍷', '🥗', '😴', '💊'];
  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];
  const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const openNew = () => {
    setEditingId(null);
    setName(''); setDesc(''); setIcon('🔥'); setColor('#10B981'); setType('positive'); setFrequency('daily'); setCustomDays([1]);
    setShowAddForm(true);
  };

  const startEdit = (habit: HabitWithStats) => {
    setEditingId(habit.id);
    setName(habit.name); setDesc(habit.description); setIcon(habit.icon);
    setColor(habit.color); setType(habit.type || 'positive'); setFrequency(habit.frequency);
    setCustomDays(habit.targetDays.length > 0 ? habit.targetDays : [1]);
    setShowAddForm(true);
  };

  const toggleCustomDay = (d: number) => {
    setCustomDays(prev => {
      const next = prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d];
      return next.length > 0 ? next : [d];
    });
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleDelete = (h: HabitWithStats) => {
    if (window.confirm(`¿Eliminar el hábito "${h.name}"? Se borrará su historial completo y no se puede deshacer.`)) {
      deleteHabit(h.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let targetDays = [0, 1, 2, 3, 4, 5, 6];
    if (frequency === 'weekdays') targetDays = [1, 2, 3, 4, 5];
    if (frequency === 'weekends') targetDays = [0, 6];
    if (frequency === 'custom') targetDays = [...customDays].sort();

    if (editingId) {
      updateHabit(editingId, {
        name: name.trim(),
        description: desc.trim(),
        icon,
        color,
        frequency,
        targetDays,
        type,
      });
    } else {
      addHabit({
        name: name.trim(),
        description: desc.trim(),
        icon,
        color,
        type,
        frequency,
        targetDays,
        startDate: new Date().toISOString().split('T')[0],
        archived: false,
      });
    }

    closeForm();
  };

  return (
    <div className="habits-module-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="module-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Hábitos & Rutinas</h2>
          <p className="module-subtitle">Construye consistencia día a día</p>
        </div>
        <button className="action-green-btn" onClick={openNew}>
          <Plus size={14} /> Nuevo Hábito
        </button>
      </div>

      {showAddForm && (
        <div className="add-task-form-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px' }}>
          <h3 style={{ marginTop: 0, fontSize: '0.95rem', marginBottom: '12px' }}>
            {editingId ? 'Modificar hábito' : 'Crear hábito'}
          </h3>
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

              {/* Tipo de hábito */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '6px' }}>Tipo</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setType('positive')}
                    style={{
                      padding: '6px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: type === 'positive' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      border: `1px solid ${type === 'positive' ? '#10B981' : 'var(--border-color)'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: type === 'positive' ? '#34D399' : 'var(--text-subtle)',
                      fontSize: '0.75rem'
                    }}
                  >
                    <Check size={13} /> Positivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('negative')}
                    style={{
                      padding: '6px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: type === 'negative' ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
                      border: `1px solid ${type === 'negative' ? '#F43F5E' : 'var(--border-color)'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: type === 'negative' ? '#FB7185' : 'var(--text-subtle)',
                      fontSize: '0.75rem'
                    }}
                  >
                    <Ban size={13} /> Negativo
                  </button>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                  {type === 'negative'
                    ? 'Hábito de evitación: marcas los días en que ocurrió (ej. días que bebiste alcohol).'
                    : 'Hábito a construir: marcas los días que lo cumples.'}
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '6px' }}>Icono</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '220px' }}>
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
                  <option value="custom">Días específicos</option>
                </select>
              </div>

              {frequency === 'custom' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '6px' }}>
                    ¿Qué días de la semana? (semanal)
                  </label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {WEEK_ORDER.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleCustomDay(d)}
                        title={DAY_LABELS[d]}
                        style={{
                          width: '34px',
                          height: '34px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: customDays.includes(d) ? 'rgba(16,185,129,0.18)' : 'transparent',
                          border: `1px solid ${customDays.includes(d) ? '#10B981' : 'var(--border-color)'}`,
                          color: customDays.includes(d) ? '#34D399' : 'var(--text-subtle)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {DAY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                    Ej: "Desear buena semana" solo los lunes.
                  </p>
                </div>
              )}
            </div>

            <div className="task-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="outline-action-btn" onClick={closeForm}>Cancelar</button>
              <button type="submit" className="action-green-btn">{editingId ? 'Guardar cambios' : 'Crear Hábito'}</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {habitsWithStats.map(habit => {
          const isNegative = habit.type === 'negative';
          return (
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
                    <h4 style={{ margin: 0, fontSize: '0.95rem' }}>
                      {habit.name}
                      <span
                        style={{
                          marginLeft: '8px',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          verticalAlign: 'middle',
                          color: isNegative ? '#FB7185' : '#34D399',
                          background: isNegative ? 'rgba(244,63,94,0.12)' : 'rgba(16,185,129,0.12)',
                          border: `1px solid ${isNegative ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`
                        }}
                      >
                        {isNegative ? 'Negativo' : 'Positivo'}
                      </span>
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-subtle)' }}>{habit.description}</p>
                    {habit.frequency === 'custom' && (
                      <div style={{ marginTop: '4px', fontSize: '0.68rem', color: 'var(--text-subtle)', display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                        {WEEK_ORDER.map(d => (
                          <span
                            key={d}
                            style={{
                              width: '22px', height: '22px', fontSize: '0.6rem', fontWeight: 700,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              borderRadius: '6px',
                              background: habit.targetDays.includes(d) ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${habit.targetDays.includes(d) ? 'rgba(16,185,129,0.5)' : 'transparent'}`,
                              color: habit.targetDays.includes(d) ? '#34D399' : 'var(--text-subtle)'
                            }}
                          >
                            {DAY_LABELS[d]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleHabitToday(habit.id)}
                  title={isNegative ? (habit.completedToday ? 'Hoy lo consumiste (día registrado)' : 'Marca el día de hoy como consumo') : (habit.completedToday ? 'Completado hoy' : 'Completar hoy')}
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
                {isNegative ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} style={{ color: '#F43F5E' }} />
                      <span>Este mes: <strong>{habit.currentMonthCount} veces</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Flame size={14} style={{ color: '#F97316' }} />
                      <span>Hoy: <strong>{habit.completedToday ? 'Sí' : 'No'}</strong></span>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                <button
                  onClick={() => startEdit(habit)}
                  title="Modificar"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: '4px' }}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(habit)}
                  title="Eliminar"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(244,63,94,0.8)', padding: '4px' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};