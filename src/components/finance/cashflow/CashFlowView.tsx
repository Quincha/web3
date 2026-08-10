import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Search, Filter, Trash2, Pencil } from 'lucide-react';
import { useFinance, financeCategoryLabel } from '../../../context/FinanceContext';
import type { TransactionType, Movimiento } from '../../../types/finance';
import { TransactionSidebar } from './TransactionSidebar';

export const CashFlowView: React.FC = () => {
  const { movimientos, deleteMovimiento } = useFinance();
  const [activeType, setActiveType] = useState<TransactionType | 'todos'>('todos');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [monthFilter, setMonthFilter] = useState<string>('todos');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarType, setSidebarType] = useState<TransactionType>('ingreso');
  const [movToEdit, setMovToEdit] = useState<Movimiento | null>(null);

  const openSidebar = (type: TransactionType) => {
    setSidebarType(type);
    setMovToEdit(null);
    setIsSidebarOpen(true);
  };

  const openEdit = (mov: Movimiento) => {
    setSidebarType(mov.type);
    setMovToEdit(mov);
    setIsSidebarOpen(true);
  };

  const confirmDelete = (mov: Movimiento) => {
    if (window.confirm(`¿Eliminar el movimiento "${mov.description}" por ${formatCurrency(mov.amount)}?`)) {
      deleteMovimiento(mov.id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const currentMonth = new Date().toISOString().slice(0, 7);

  const filteredMovimientos = movimientos
    .filter(m => activeType === 'todos' || m.type === activeType)
    .filter(m => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return m.description.toLowerCase().includes(q)
        || (m.categoryId || '').toLowerCase().includes(q)
        || String(m.amount).includes(q);
    })
    .filter(m => statusFilter === 'todos' || m.status === statusFilter)
    .filter(m => monthFilter === 'todos' || (m.date && m.date.slice(0, 7) === monthFilter));

  const typeColor = (t: TransactionType) =>
    t === 'ingreso' ? 'var(--accent-green)' : t === 'gasto' ? 'var(--accent-red)' : 'var(--text-primary)';

  return (
    <div className="finance-view-container">
      {/* Top Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
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

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
            value={search}
            onChange={e => setSearch(e.target.value)}
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
        <button
          className={`secondary-btn ${filtersOpen ? 'active' : ''}`}
          style={{ padding: '8px 12px' }}
          onClick={() => setFiltersOpen(o => !o)}
        >
          <Filter size={16} /> Filtros
        </button>
      </div>

      {filtersOpen && (
        <div style={{
          display: 'flex',
          gap: '16px',
          padding: '16px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-light)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Estado</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            >
              <option value="todos">Todos</option>
              <option value="Pagada">Pagada</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Emitida">Emitida</option>
              <option value="Parcial">Parcial</option>
              <option value="Cancelada">Cancelada</option>
              <option value="Anulada">Anulada</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Mes</label>
            <input
              type="month"
              value={monthFilter === 'todos' ? currentMonth : monthFilter}
              onChange={e => setMonthFilter(e.target.value || 'todos')}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
          </div>
        </div>
      )}

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
              gridTemplateColumns: '110px 2fr 1.2fr 120px 120px 90px',
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
              <span style={{ textAlign: 'right' }}>Acciones</span>
            </div>

            {/* Rows */}
            {filteredMovimientos.map(mov => {
              const cat = financeCategoryLabel(mov.categoryId);
              return (
                <div key={mov.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '110px 2fr 1.2fr 120px 120px 90px',
                  padding: '16px',
                  borderBottom: '1px solid var(--border-light)',
                  alignItems: 'center',
                  transition: 'background 0.2s ease'
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {new Date(mov.date).toLocaleDateString()}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '15px' }}>
                      {mov.description}
                      {mov.type === 'transferencia' && mov.targetAccountId && (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginLeft: '8px' }}>
                          → {mov.targetAccountId === 'cuenta_objetivos' ? 'Cuenta Objetivos' : 'Otra cuenta'}
                        </span>
                      )}
                    </span>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color }} />
                    {cat.name}
                  </span>

                  {/* Status Badge */}
                  <span style={{
                    justifySelf: 'start',
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

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      color: typeColor(mov.type),
                      fontWeight: 600,
                      fontSize: '16px'
                    }}>
                      {mov.type === 'ingreso' ? '+' : mov.type === 'gasto' ? '-' : '→'}
                      {formatCurrency(mov.amount)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                    <button
                      title="Eliminar"
                      onClick={() => confirmDelete(mov)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      title="Editar"
                      onClick={() => openEdit(mov)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-green)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <TransactionSidebar
        isOpen={isSidebarOpen}
        onClose={() => { setIsSidebarOpen(false); setMovToEdit(null); }}
        defaultType={sidebarType}
        movimientoToEdit={movToEdit}
      />
    </div>
  );
};