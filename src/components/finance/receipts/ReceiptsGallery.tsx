import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Upload, ScanLine, FileText, Trash2 } from 'lucide-react';
import { useFinance, financeCategoryLabel } from '../../../context/FinanceContext';
import type { Movimiento } from '../../../types/finance';
import { TransactionSidebar } from '../cashflow/TransactionSidebar';
import { tokens } from '../../../theme/tokens';

export const ReceiptsGallery: React.FC = () => {
  const { movimientos, deleteMovimiento } = useFinance();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const gastos = movimientos.filter(m => m.type === 'gasto');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const confirmDelete = (mov: Movimiento) => {
    if (window.confirm(`¿Eliminar el comprobante "${mov.description}"?`)) {
      deleteMovimiento(mov.id);
    }
  };

  return (
    <div className="finance-view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 4px 0' }}>Comprobantes</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
            Los gastos registrados en el flujo de caja aparecen aquí como comprobantes.
          </p>
        </div>
        <button className="primary-btn" onClick={() => setIsSidebarOpen(true)}>
          <Upload size={16} /> Registrar Comprobante
        </button>
      </div>

      {gastos.length === 0 ? (
        <Card padding="lg" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px 0' }}>
            <FileText size={40} color="var(--text-tertiary)" />
            <p style={{ color: 'var(--text-tertiary)', margin: 0, textAlign: 'center' }}>
              Todavía no hay comprobantes.<br />
              Registra un gasto para asociarlo a un comprobante.
            </p>
          </div>
        </Card>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '20px',
          alignItems: 'start',
          marginTop: '24px'
        }}>
          {gastos.map(receipt => {
            const cat = financeCategoryLabel(receipt.categoryId);
            return (
              <Card key={receipt.id} padding="none" style={{ overflow: 'hidden', position: 'relative' }} className="premium-card-hover">
                {/* Thumbnail */}
                <div style={{
                  width: '100%',
                  height: '120px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(145deg, rgba(16,42,45,0.6), rgba(6,8,11,0.9))',
                  borderBottom: `1px solid ${tokens.colors.accent.green}30`
                }}>
                  <FileText size={44} color={cat.color} />
                  <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '18px' }}>{formatCurrency(receipt.amount)}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {new Date(receipt.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Info and Status */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-secondary)', overflow: 'hidden' }}>
                      <FileText size={14} style={{ flexShrink: 0 }} /> {receipt.description}
                    </span>
                    <button
                      title="Eliminar comprobante"
                      onClick={() => confirmDelete(receipt)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '6px', flexShrink: 0 }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 500, color: 'var(--accent-green)' }}>
                    <ScanLine size={14} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                      {cat.name}
                    </span>
                    <span style={{ color: 'var(--text-tertiary)' }}>· {receipt.status}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <TransactionSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        defaultType="gasto"
      />
    </div>
  );
};