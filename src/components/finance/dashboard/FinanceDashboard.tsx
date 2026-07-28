import React from 'react';
import { useFinance } from '../../../context/FinanceContext';
import { TrendingUp, TrendingDown, CreditCard, Bell, Sparkles, DollarSign, ArrowUpRight, ArrowDownRight, Wallet, Users } from 'lucide-react';
import { Card } from '../../ui/Card';

export const FinanceDashboard: React.FC = () => {
  const { stats, insights, markInsightAsRead } = useFinance();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const unreadInsights = insights.filter(i => !i.read);

  return (
    <div className="finance-dashboard-grid">
      
      {/* KPIs Principales */}
      <div className="finance-stats-row">
        <Card padding="md" className="finance-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={16} color="var(--text-secondary)" />
            <span className="finance-stat-title">Saldo Disponible</span>
          </div>
          <span className="finance-stat-value">{formatCurrency(stats.availableBalance)}</span>
        </Card>

        <Card padding="md" className="finance-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowUpRight size={16} color="var(--text-secondary)" />
            <span className="finance-stat-title">Ingresos del Mes</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="finance-stat-value">{formatCurrency(stats.monthlyIncome)}</span>
            <span className={`finance-stat-variation ${stats.monthlyIncomeVariation >= 0 ? 'positive' : 'negative'}`}>
              {stats.monthlyIncomeVariation >= 0 ? '▲' : '▼'} {Math.abs(stats.monthlyIncomeVariation)}%
            </span>
          </div>
        </Card>

        <Card padding="md" className="finance-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowDownRight size={16} color="var(--text-secondary)" />
            <span className="finance-stat-title">Gastos del Mes</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="finance-stat-value">{formatCurrency(stats.monthlyExpenses)}</span>
            <span className={`finance-stat-variation ${stats.monthlyExpensesVariation <= 0 ? 'positive' : 'negative'}`}>
              {stats.monthlyExpensesVariation >= 0 ? '▲' : '▼'} {Math.abs(stats.monthlyExpensesVariation)}%
            </span>
          </div>
        </Card>

        <Card padding="md" className="finance-stat-card" style={{ borderColor: stats.monthlyResult >= 0 ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={16} color="var(--text-secondary)" />
            <span className="finance-stat-title">Resultado del Mes</span>
          </div>
          <span className="finance-stat-value" style={{ color: stats.monthlyResult >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {stats.monthlyResult > 0 ? '+' : ''}{formatCurrency(stats.monthlyResult)}
          </span>
        </Card>
      </div>

      {/* Deudas y Vencimientos */}
      <div className="finance-stats-row">
        <Card padding="md" className="finance-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} color="var(--accent-green)" />
            <span className="finance-stat-title">Total Por Cobrar</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span className="finance-stat-value">{formatCurrency(stats.totalReceivables)}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={12} /> {stats.receivablesCount} Clientes
            </span>
          </div>
        </Card>

        <Card padding="md" className="finance-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={16} color="var(--accent-red)" />
            <span className="finance-stat-title">Total Por Pagar</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span className="finance-stat-value">{formatCurrency(stats.totalPayables)}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={12} /> {stats.payablesCount} Proveedores
            </span>
          </div>
        </Card>

        {stats.nextDueCard && (
          <Card padding="md" className="finance-stat-card" style={{ background: 'rgba(234, 179, 8, 0.05)', borderColor: 'rgba(234, 179, 8, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={16} color="#eab308" />
              <span className="finance-stat-title">Próximo Vencimiento</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
              <span style={{ fontWeight: 500, fontSize: '15px' }}>{stats.nextDueCard.name}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#eab308', fontSize: '13px', fontWeight: 600 }}>vence {stats.nextDueCard.dueDate}</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(stats.nextDueCard.amount)}</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Alertas IA */}
      {unreadInsights.length > 0 && (
        <Card padding="lg" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Sparkles size={18} color="#8b5cf6" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Alertas IA</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {unreadInsights.map(insight => (
              <div key={insight.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--bg-card)',
                borderRadius: '8px',
                borderLeft: `3px solid ${
                  insight.type === 'danger' ? 'var(--accent-red)' : 
                  insight.type === 'warning' ? '#eab308' : 
                  insight.type === 'success' ? 'var(--accent-green)' : '#3b82f6'
                }`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Bell size={14} color="var(--text-secondary)" />
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{insight.message}</span>
                </div>
                <button 
                  onClick={() => markInsightAsRead(insight.id)}
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    color: 'var(--text-tertiary)', 
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Ocultar
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Gráficos Placeholder */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        <Card padding="lg" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>Gráfico de Flujo de Caja (Próximamente)</p>
        </Card>
        <Card padding="lg" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>Distribución por Categoría (Próximamente)</p>
        </Card>
      </div>
    </div>
  );
};
