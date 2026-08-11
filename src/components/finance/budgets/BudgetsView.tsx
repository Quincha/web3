import React, { useEffect, useState } from 'react';
import { Card } from '../../ui/Card';
import { useFinance, financeCategoryLabel, FINANCE_CATEGORIES } from '../../../context/FinanceContext';
import { DataSyncService } from '../../../services/DataSyncService';
import { Target, X, Trash2, DollarSign } from 'lucide-react';

const BUDGETS_KEY = 'quincha_finance_budgets';

export interface Budget {
  id: string;
  categoryId: string;
  amountLimit: number;
  period: 'Mensual' | 'Anual';
}

function loadBudgets(): Budget[] {
  try {
    const raw = localStorage.getItem(BUDGETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export const BudgetsView: React.FC = () => {
  const { movimientos } = useFinance();
  const [budgets, setBudgets] = useState<Budget[]>(() => loadBudgets());
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ categoryId: '', amountLimit: '', period: 'Mensual' as 'Mensual' | 'Anual' });
  const [formError, setFormError] = useState('');

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const year = String(now.getFullYear());

  useEffect(() => {
    localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
    DataSyncService.markDirty('budgets');
  }, [budgets]);

  // Restaura datos bajados del servidor (pull) al cambiar de equipo.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { data?: { budgets?: Budget[] } } | undefined;
      const data = detail?.data;
      if (!data || !Array.isArray(data.budgets)) return;
      setBudgets(data.budgets);
    };
    window.addEventListener('quincha-restore:budgets', handler);
    return () => window.removeEventListener('quincha-restore:budgets', handler);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const spentFor = (categoryId: string, period: 'Mensual' | 'Anual') => {
    return movimientos
      .filter(m => m.type === 'gasto' && m.categoryId === categoryId)
      .filter(m => period === 'Mensual' ? m.date.startsWith(monthKey) : m.date.startsWith(year))
      .reduce((sum, m) => sum + m.amount, 0);
  };

  const openModal = () => {
    setForm({ categoryId: '', amountLimit: '', period: 'Mensual' });
    setFormError('');
    setModalOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) { setFormError('Selecciona una categoría.'); return; }
    const limit = parseFloat(form.amountLimit);
    if (!form.amountLimit || isNaN(limit) || limit <= 0) { setFormError('Ingresa un límite mayor a 0.'); return; }
    setBudgets(prev => [
      ...prev,
      { id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, categoryId: form.categoryId, amountLimit: limit, period: form.period },
    ]);
    setModalOpen(false);
  };

  const deleteBudget = (id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
  };

  const usedCategories = budgets.map(b => b.categoryId);

  return (
    <div className="finance-view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 4px 0' }}>Presupuestos</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
            Define límites de gasto por categoría y compara con lo gastado.
          </p>
        </div>
        <button className="primary-btn" onClick={openModal}>
          <Target size={16} /> Nuevo Presupuesto
        </button>
      </div>

      {budgets.length === 0 ? (
        <Card padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px 0' }}>
            <Target size={40} color="var(--text-tertiary)" />
            <p style={{ color: 'var(--text-tertiary)', margin: 0, textAlign: 'center' }}>
              No hay presupuestos configurados.<br />
              Crea uno para controlar tus gastos por categoría.
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {budgets.map(b => {
            const cat = financeCategoryLabel(b.categoryId);
            const spent = spentFor(b.categoryId, b.period);
            const pct = b.amountLimit > 0 ? Math.min(Math.round((spent / b.amountLimit) * 100), 100) : 0;
            const over = spent > b.amountLimit;
            return (
              <Card key={b.id} padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderLeft: `4px solid ${over ? 'var(--accent-red)' : cat.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${cat.color}1A`, color: cat.color }}>
                      <Target size={16} />
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{cat.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{b.period}</div>
                    </div>
                  </div>
                  <button
                    title="Eliminar presupuesto"
                    onClick={() => deleteBudget(b.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(spent)}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    de {formatCurrency(b.amountLimit)}
                  </span>
                </div>

                <div style={{ height: 10, background: 'var(--bg-primary)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: over ? 'var(--accent-red)' : cat.color, borderRadius: 6, transition: 'width 0.3s ease' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: over ? 'var(--accent-red)' : 'var(--text-secondary)', fontWeight: 600 }}>
                    {over ? 'Excedido' : `${pct}% usado`}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    {over ? `+${formatCurrency(spent - b.amountLimit)}` : `Restan ${formatCurrency(b.amountLimit - spent)}`}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="finance-modal-overlay">
          <div onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <form
            onSubmit={submit}
            className="finance-modal-card"
          >
            <div className="finance-modal-header">
              <h3 className="finance-modal-title">Nuevo Presupuesto</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="finance-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="finance-form-group">
              <label className="finance-form-label">Categoría</label>
              <select
                className="premium-select"
                value={form.categoryId}
                onChange={e => { setForm(f => ({ ...f, categoryId: e.target.value })); setFormError(''); }}
              >
                <option value="" disabled>Seleccionar...</option>
                {FINANCE_CATEGORIES.filter(c => !usedCategories.includes(c.id)).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="finance-form-group" style={{ flex: 1 }}>
                <label className="finance-form-label">Límite</label>
                <input
                  type="number"
                  className="premium-input"
                  value={form.amountLimit}
                  min="0"
                  onChange={e => { setForm(f => ({ ...f, amountLimit: e.target.value })); setFormError(''); }}
                  placeholder="0"
                />
              </div>
              <div className="finance-form-group" style={{ flex: 1 }}>
                <label className="finance-form-label">Período</label>
                <select
                  className="premium-select"
                  value={form.period}
                  onChange={e => setForm(f => ({ ...f, period: e.target.value as 'Mensual' | 'Anual' }))}
                >
                  <option value="Mensual">Mensual</option>
                  <option value="Anual">Anual</option>
                </select>
              </div>
            </div>

            {formError && (
              <div style={{ fontSize: '13px', color: 'var(--accent-red)', background: 'rgba(248, 113, 113, 0.08)', padding: '10px 12px', borderRadius: '8px' }}>
                {formError}
              </div>
            )}

            <button type="submit" className="primary-btn" style={{ width: '100%' }}>
              <DollarSign size={16} /> Guardar Presupuesto
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
