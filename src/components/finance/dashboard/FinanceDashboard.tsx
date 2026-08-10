import React from 'react';
import { useFinance, financeCategoryLabel } from '../../../context/FinanceContext';
import { TrendingUp, TrendingDown, CreditCard, Bell, Sparkles, DollarSign, ArrowUpRight, ArrowDownRight, Wallet, Users } from 'lucide-react';
import { Card } from '../../ui/Card';

export const FinanceDashboard: React.FC = () => {
  const { stats, movimientos, insights, markInsightAsRead } = useFinance();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatShort = (amount: number) => {
    if (Math.abs(amount) >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (Math.abs(amount) >= 1000) return `${Math.round(amount / 1000)}K`;
    return String(Math.round(amount));
  };

  // Flujo neto de los últimos 6 meses
  const months: { label: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let income = 0;
    let expense = 0;
    movimientos.forEach(m => {
      if (!m.date.startsWith(key)) return;
      if (m.type === 'ingreso') income += m.amount;
      if (m.type === 'gasto') expense += m.amount;
    });
    months.push({
      label: d.toLocaleDateString('es-ES', { month: 'short' }),
      income,
      expense,
    });
  }
  const maxMonth = Math.max(1, ...months.map(m => Math.max(m.income, m.expense)));

  // Distribución de gastos por categoría del mes actual
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const catTotals: { name: string; total: number; color: string }[] = [];
  movimientos.forEach(m => {
    if (m.type !== 'gasto' || !m.date || !m.date.startsWith(monthKey)) return;
    const cat = financeCategoryLabel(m.categoryId);
    const found = catTotals.find(c => c.name === cat.name);
    if (found) found.total += m.amount;
    else catTotals.push({ name: cat.name, total: m.amount, color: cat.color });
  });
  catTotals.sort((a, b) => b.total - a.total);
  const catMax = Math.max(1, ...catTotals.map(c => c.total));

  const unreadInsights = insights.filter(i => !i.read);

  const chartH = 180;

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

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        <Card padding="lg" style={{ minHeight: '300px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Flujo de Caja (últimos 6 meses)</h3>
          <svg width="100%" height={chartH} viewBox={`0 0 ${months.length * 100} ${chartH}`} style={{ display: 'block' }}>
            {months.map((m, i) => {
              const bw = 70;
              const x = i * 100 + 15;
              const hB = Math.max(6, (m.expense / maxMonth) * (chartH - 40));
              const hG = Math.max(6, (m.income / maxMonth) * (chartH - 40));
              return (
                <g key={m.label}>
                  <rect x={x} y={chartH - 20 - hG} width={bw / 2 - 4} height={hG} rx={4} fill="#16F0B5" />
                  <rect x={x + bw / 2} y={chartH - 20 - hB} width={bw / 2 - 4} height={hB} rx={4} fill="#FF5F73" />
                  <text x={x + bw / 2 - 2} y={chartH - 4} textAnchor="middle" fontSize="14" fill="#94A3B8">{m.label}</text>
                </g>
              );
            })}
          </svg>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#16F0B5', display: 'inline-block' }} /> Ingresos
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#FF5F73', display: 'inline-block' }} /> Gastos
            </span>
          </div>
        </Card>
        <Card padding="lg" style={{ minHeight: '300px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Gastos por Categoría</h3>
          {catTotals.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', textAlign: 'center', paddingTop: '40px' }}>
              Sin gastos este mes.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {catTotals.slice(0, 6).map(c => (
                <div key={c.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{c.name}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatShort(c.total)}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--border-primary)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round((c.total / catMax) * 100)}%`, background: c.color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
