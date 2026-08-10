import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { useFinance } from '../../../context/FinanceContext';
import { Plus, TrendingUp, TrendingDown, Clock, Trash2, X, Banknote } from 'lucide-react';
import type { Deuda } from '../../../types/finance';

interface ModalState {
  type: 'Por Cobrar' | 'Por Pagar';
}

export const DebtsBalanceView: React.FC = () => {
  const { deudas, addDeuda, updateDeuda, deleteDeuda } = useFinance();
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState({
    entityName: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'Media' as 'Alta' | 'Media' | 'Baja',
  });
  const [formError, setFormError] = useState('');

  const porCobrar = deudas.filter(d => d.type === 'Por Cobrar');
  const porPagar = deudas.filter(d => d.type === 'Por Pagar');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateProgress = (paid: number, total: number) => {
    if (total === 0) return 0;
    return Math.min(Math.round((paid / total) * 100), 100);
  };

  const openModal = (type: 'Por Cobrar' | 'Por Pagar') => {
    setModal({ type });
    setForm({ entityName: '', amount: '', dueDate: new Date().toISOString().split('T')[0], priority: 'Media' });
    setFormError('');
  };

  const submitNewDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.entityName) { setFormError('Indica el nombre de la entidad.'); return; }
    if (!form.amount || isNaN(amount) || amount <= 0) { setFormError('Ingresa un monto mayor a 0.'); return; }
    addDeuda({
      type: modal!.type,
      entityId: 'manual',
      entityName: form.entityName,
      amount,
      paidAmount: 0,
      dueDate: form.dueDate,
      status: 'Pendiente',
      priority: form.priority,
      tags: [],
    });
    setModal(null);
  };

  const abonar = (deuda: Deuda) => {
    const input = window.prompt(`¿Cuánto abonar a "${deuda.entityName}"?\nResta: ${formatCurrency(deuda.amount - deuda.paidAmount)}`);
    if (input === null) return;
    const amount = parseFloat(input);
    if (isNaN(amount) || amount <= 0) {
      window.alert('Monto inválido.');
      return;
    }
    const newPaid = Math.min(deuda.paidAmount + amount, deuda.amount);
    updateDeuda(deuda.id, {
      paidAmount: newPaid,
      status: newPaid >= deuda.amount ? 'Pagada' : deuda.status,
    });
  };

  const confirmDelete = (deuda: Deuda) => {
    if (window.confirm(`¿Eliminar la deuda "${deuda.entityName}"?`)) {
      deleteDeuda(deuda.id);
    }
  };

  const renderDeudaCard = (deuda: Deuda, colorStr: string) => {
    const progress = calculateProgress(deuda.paidAmount, deuda.amount);

    return (
      <div key={deuda.id} style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        background: 'var(--bg-secondary)',
        transition: 'background 0.2s ease'
      }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border-primary)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '15px' }}>
              {deuda.entityName}
              {deuda.priority && deuda.priority !== 'Media' && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: deuda.priority === 'Alta' ? 'rgba(248, 113, 113, 0.1)' : 'var(--border-primary)',
                  color: deuda.priority === 'Alta' ? 'var(--accent-red)' : 'var(--text-secondary)'
                }}>
                  {deuda.priority}
                </span>
              )}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> {deuda.status === 'Atrasada' ? 'Venció' : 'Vence'}: {new Date(deuda.dueDate).toLocaleDateString()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`finance-badge ${deuda.status === 'Atrasada' ? 'danger' : deuda.status === 'Pagada' ? 'success' : 'neutral'}`}>
              {deuda.status}
            </span>
            <button
              title="Eliminar"
              onClick={() => confirmDelete(deuda)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Progress Bar & Amounts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Pagado: {formatCurrency(deuda.paidAmount)}</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Total: {formatCurrency(deuda.amount)}</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: colorStr, borderRadius: '4px' }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: colorStr, fontWeight: 500 }}>
            Resta: {formatCurrency(deuda.amount - deuda.paidAmount)}
          </div>
        </div>

        {deuda.status !== 'Pagada' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              className="primary-btn"
              style={{ fontSize: '12px', padding: '6px 14px', background: colorStr, color: colorStr === 'var(--accent-red)' ? '#fff' : 'var(--bg-primary)' }}
              onClick={() => abonar(deuda)}
            >
              <Banknote size={13} /> Abonar
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="finance-view-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

      {/* Columna Por Cobrar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} color="var(--accent-green)" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Por Cobrar</h2>
          </div>
          <button className="secondary-btn" onClick={() => openModal('Por Cobrar')}>
            <Plus size={14} /> Nueva Deuda
          </button>
        </div>

        <Card padding="none" style={{ overflow: 'hidden' }}>
          {porCobrar.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              No hay cuentas por cobrar pendientes.
            </div>
          ) : (
            porCobrar.map(d => renderDeudaCard(d, 'var(--accent-green)'))
          )}
        </Card>
      </div>

      {/* Columna Por Pagar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={20} color="var(--accent-red)" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Por Pagar</h2>
          </div>
          <button className="secondary-btn" onClick={() => openModal('Por Pagar')}>
            <Plus size={14} /> Nueva Deuda
          </button>
        </div>

        <Card padding="none" style={{ overflow: 'hidden' }}>
          {porPagar.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              No hay cuentas por pagar pendientes.
            </div>
          ) : (
            porPagar.map(d => renderDeudaCard(d, 'var(--accent-red)'))
          )}
        </Card>
      </div>

      {/* Modal Nueva Deuda */}
      {modal && (
        <div className="finance-modal-overlay">
          <div
            onClick={() => setModal(null)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <form
            onSubmit={submitNewDebt}
            className="finance-modal-card"
          >
            <div className="finance-modal-header">
              <h3 className="finance-modal-title">
                Nueva Deuda — {modal.type}
              </h3>
              <button type="button" onClick={() => setModal(null)} className="finance-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="finance-form-group">
              <label className="finance-form-label">Entidad</label>
              <input
                className="premium-input"
                value={form.entityName}
                onChange={e => { setForm(f => ({ ...f, entityName: e.target.value })); setFormError(''); }}
                placeholder={modal.type === 'Por Cobrar' ? 'Ej: Cliente Acme' : 'Ej: Proveedor Hostinger'}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="finance-form-group" style={{ flex: 1 }}>
                <label className="finance-form-label">Monto</label>
                <input
                  type="number"
                  className="premium-input"
                  value={form.amount}
                  min="0"
                  onChange={e => { setForm(f => ({ ...f, amount: e.target.value })); setFormError(''); }}
                  placeholder="0"
                />
              </div>
              <div className="finance-form-group" style={{ flex: 1 }}>
                <label className="finance-form-label">Vence</label>
                <input
                  type="date"
                  className="premium-input"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="finance-form-group">
              <label className="finance-form-label">Prioridad</label>
              <select
                className="premium-select"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as 'Alta' | 'Media' | 'Baja' }))}
              >
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>

            {formError && (
              <div style={{ fontSize: '13px', color: 'var(--accent-red)', background: 'rgba(248, 113, 113, 0.08)', padding: '10px 12px', borderRadius: '8px' }}>
                {formError}
              </div>
            )}

            <button
              type="submit"
              className="primary-btn"
              style={{ background: 'var(--accent-green)', color: 'var(--bg-primary)', width: '100%' }}
            >
              Guardar Deuda
            </button>
          </form>
        </div>
      )}
    </div>
  );
};