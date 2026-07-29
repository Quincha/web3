import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Search, Filter } from 'lucide-react';
import { useFinance } from '../../../context/FinanceContext';
import type { TransactionType } from '../../../types/finance';
import { TransactionSidebar } from './TransactionSidebar';

export const CashFlowView: React.FC = () => {
  const { movimientos } = useFinance();
  const [activeType, setActiveType] = useState<TransactionType | 'todos'>('todos');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarType, setSidebarType] = useState<TransactionType>('ingreso');

  const openSidebar = (type: TransactionType) => {
    setSidebarType(type);
    setIsSidebarOpen(true);
  };

  const filteredMovimientos = activeType === 'todos' 
    ? movimientos 
    : movimientos.filter(m => m.type === activeType);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="finance-view-container">
      {/* Top Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="finance-nav-pills" style={{ padding: '2px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
          <button 
            className={`finance-pill ${activeType === 'todos' ? 'active' : ''}`}
            onClick={() => setActiveType('todos')}
          >
            Todos
          </button>
          <button 
            className={`finance-pill ${activeType === 'ingreso' ? 'active' : ''}`}
            onClick={() => setActiveType('ingreso')}
          >
            Ingresos
          </button>
          <button 
            className={`finance-pill ${activeType === 'gasto' ? 'active' : ''}`}
            onClick={() => setActiveType('gasto')}
          >
            Gastos
          </button>
          <button 
            className={`finance-pill ${activeType === 'transferencia' ? 'active' : ''}`}
            onClick={() => setActiveType('transferencia')}
          >
            Transferencias
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="primary-btn" 
            style={{ background: 'var(--accent-green)', color: 'var(--bg-primary)' }}
            onClick={() => openSidebar('ingreso')}
          >
            <ArrowUpRight size={16} />
            Ingreso
          </button>
          <button 
            className="primary-btn" 
            style={{ background: 'var(--accent-red)', color: '#fff' }}
            onClick={() => openSidebar('gasto')}
          >
            <ArrowDownRight size={16} />
            Gasto
          </button>
          <button className="secondary-btn" onClick={() => openSidebar('transferencia')}>
            <RefreshCw size={16} />
            Transferir
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-light)',
          borderRadius: '8px',
          padding: '8px 12px',
          flex: 1
        }}>
          <Search size={16} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
          <input 
            type="text" 
            placeholder="Buscar por descripción, categoría o monto..." 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-primary)',
              width: '100%',
              outline: 'none',
              fontSize: '14px'
            }} 
          />
        </div>
        <button className="secondary-btn" style={{ padding: '8px 12px' }}>
          <Filter size={16} /> Filtros
        </button>
      </div>

      {/* List */}
      <Card padding="none" style={{ overflow: 'hidden' }}>
        {filteredMovimientos.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            No hay movimientos registrados para esta vista.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '100px 2fr 1fr 1fr 120px', 
              padding: '16px', 
              borderBottom: '1px solid var(--border-light)',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <span>Fecha</span>
              <span>Descripción</span>
              <span>Categoría</span>
              <span>Estado</span>
              <span style={{ textAlign: 'right' }}>Monto</span>
            </div>

            {/* Rows */}
            {filteredMovimientos.map(mov => (
              <div key={mov.id} style={{ 
                display: 'grid', 
                gridTemplateColumns: '100px 2fr 1fr 1fr 120px', 
                padding: '16px', 
                borderBottom: '1px solid var(--border-light)',
                alignItems: 'center',
                transition: 'background 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  {new Date(mov.date).toLocaleDateString()}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '15px' }}>{mov.description}</span>
                  {mov.tags && mov.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {mov.tags.map(tag => (
                        <span key={tag} style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--border-primary)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{mov.categoryId || 'Sin categoría'}</span>
                
                {/* Status Badge */}
                <div>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: mov.status === 'Pagada' ? 'rgba(52, 211, 153, 0.1)' : 
                               mov.status === 'Pendiente' ? 'rgba(234, 179, 8, 0.1)' : 'var(--border-primary)',
                    color: mov.status === 'Pagada' ? 'var(--accent-green)' : 
                           mov.status === 'Pendiente' ? '#eab308' : 'var(--text-secondary)'
                  }}>
                    {mov.status}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    color: mov.type === 'ingreso' ? 'var(--accent-green)' : (mov.type === 'gasto' ? 'var(--accent-red)' : 'var(--text-primary)'), 
                    fontWeight: 600, 
                    fontSize: '16px' 
                  }}>
                    {mov.type === 'ingreso' ? '+' : (mov.type === 'gasto' ? '-' : '')}
                    {formatCurrency(mov.amount)}
                  </div>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{mov.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      
      <TransactionSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        defaultType={sidebarType} 
      />
    </div>
  );
};
