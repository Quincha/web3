import React, { useState } from 'react';
import { Target, Plus, CheckCircle2, Circle, TrendingUp, X } from 'lucide-react';
import { useGoals } from '../../context/GoalsContext';
import type { GoalTimeframe } from '../../context/GoalsContext';
const TIMEFRAMES: { id: GoalTimeframe; label: string; color: string }[] = [
  { id: 'weekly', label: 'Semanales', color: '#3B82F6' },
  { id: 'monthly', label: 'Mensuales', color: '#10B981' },
  { id: 'quarterly', label: 'Trimestrales', color: '#F59E0B' },
  { id: 'yearly', label: 'Anuales', color: '#8B5CF6' }
];

export const GoalsModule: React.FC = () => {
  const { goals, addGoal, updateProgress, deleteGoal } = useGoals();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTimeframe, setNewTimeframe] = useState<GoalTimeframe>('monthly');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addGoal({
      title: newTitle.trim(),
      description: newDesc.trim(),
      timeframe: newTimeframe
    });
    setNewTitle('');
    setNewDesc('');
    setShowAddForm(false);
  };

  const getGoalsByTimeframe = (tf: GoalTimeframe) => {
    return goals.filter(g => g.timeframe === tf);
  };

  return (
    <div className="goals-module-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.2rem', color: '#fff' }}>
            <Target size={20} color="#F59E0B" />
            Mis Metas
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            Define, visualiza y alcanza tus objetivos a corto, mediano y largo plazo.
          </p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          style={{
            background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px',
            padding: '8px 16px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
          }}
        >
          <Plus size={16} /> Nueva Meta
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAdd} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Crear Nueva Meta</h3>
            <button type="button" onClick={() => setShowAddForm(false)} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={16} /></button>
          </div>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 2 }}>
              <input type="text" placeholder="Título de la meta (ej. Leer 2 libros)" value={newTitle} onChange={e => setNewTitle(e.target.value)} required autoFocus style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
            </div>
            <div style={{ flex: 1 }}>
              <select value={newTimeframe} onChange={e => setNewTimeframe(e.target.value as GoalTimeframe)} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '0.9rem', outline: 'none' }}>
                {TIMEFRAMES.map(tf => <option key={tf.id} value={tf.id} style={{ background: '#1e293b' }}>{tf.label}</option>)}
              </select>
            </div>
          </div>
          
          <textarea placeholder="Descripción o pasos clave (opcional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '0.9rem', outline: 'none', minHeight: '60px' }} />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" style={{ background: '#F59E0B', color: '#111827', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>Guardar Meta</button>
          </div>
        </form>
      )}

      {/* Grid of Timeframes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {TIMEFRAMES.map(tf => {
          const tfGoals = getGoalsByTimeframe(tf.id);
          if (tfGoals.length === 0) return null;

          return (
            <div key={tf.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: tf.color }} />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 600 }}>{tf.label}</h3>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', color: '#ccc' }}>
                  {tfGoals.length} meta{tfGoals.length > 1 ? 's' : ''}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tfGoals.map(goal => (
                  <div key={goal.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, paddingRight: '16px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', color: goal.status === 'completed' ? '#10B981' : '#fff', textDecoration: goal.status === 'completed' ? 'line-through' : 'none' }}>
                          {goal.title}
                        </h4>
                        {goal.description && <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{goal.description}</p>}
                      </div>
                      <button onClick={() => deleteGoal(goal.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '4px' }}>
                        <X size={14} />
                      </button>
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button 
                        onClick={() => updateProgress(goal.id, goal.status === 'completed' ? 0 : 100)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: goal.status === 'completed' ? '#10B981' : 'rgba(255,255,255,0.3)' }}
                      >
                        {goal.status === 'completed' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </button>
                      
                      <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${goal.progress}%`, background: goal.status === 'completed' ? '#10B981' : tf.color, transition: 'width 0.3s ease' }} />
                      </div>
                      
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', width: '35px', textAlign: 'right' }}>
                        {goal.progress}%
                      </span>
                    </div>
                    
                    {/* Progress adjustments */}
                    {goal.status !== 'completed' && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', marginTop: '8px' }}>
                        <button onClick={() => updateProgress(goal.id, goal.progress - 10)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px', fontSize: '0.7rem', color: '#ccc', cursor: 'pointer', padding: '2px 6px' }}>-10%</button>
                        <button onClick={() => updateProgress(goal.id, goal.progress + 10)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px', fontSize: '0.7rem', color: '#ccc', cursor: 'pointer', padding: '2px 6px' }}>+10%</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      {goals.length === 0 && !showAddForm && (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '12px' }}>
          <TrendingUp size={48} color="rgba(255,255,255,0.2)" style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px 0', color: '#fff' }}>No tienes metas definidas</h3>
          <p style={{ margin: '0 0 24px 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Comienza a proyectar tu futuro estableciendo metas claras.</p>
          <button onClick={() => setShowAddForm(true)} style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>Crear Primera Meta</button>
        </div>
      )}
    </div>
  );
};
