import React from 'react';
import { Card } from '../../ui/Card';
import { useFinance } from '../../../context/FinanceContext';
import { Plus, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import type { Deuda } from '../../../types/finance';

export const DebtsBalanceView: React.FC = () => {
  const { deudas } = useFinance();

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
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> {deuda.status === 'Atrasada' ? 'Venció' : 'Vence'}: {new Date(deuda.dueDate).toLocaleDateString()}
            </span>
          </div>
          <span style={{ 
            padding: '2px 8px', 
            borderRadius: '12px', 
            fontSize: '11px', 
            fontWeight: 600,
            background: deuda.status === 'Atrasada' ? 'rgba(248, 113, 113, 0.1)' : 'var(--border-primary)',
            color: deuda.status === 'Atrasada' ? 'var(--accent-red)' : 'var(--text-secondary)'
          }}>
            {deuda.status}
          </span>
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button className="secondary-btn" style={{ fontSize: '12px', padding: '4px 12px' }}>Abonar</button>
        </div>
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
          <button className="secondary-btn" style={{ padding: '6px 12px', fontSize: '13px' }}>
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
          <button className="secondary-btn" style={{ padding: '6px 12px', fontSize: '13px' }}>
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

    </div>
  );
};
