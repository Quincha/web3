import React from 'react';
import { Card } from '../../ui/Card';
import { useFinance } from '../../../context/FinanceContext';
import { Wallet, Landmark, HandCoins, PiggyBank, TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';

interface AccRow {
  id: string;
  name: string;
  type: 'Efectivo' | 'Banco' | 'Tarjeta' | 'Billetera Digital';
  color: string;
  icon: React.ReactNode;
}

const ACCOUNTS: AccRow[] = [
  { id: 'default_account', name: 'Cuenta Principal', type: 'Banco', color: '#16F0B5', icon: <Landmark size={16} /> },
  { id: 'cuenta_ahorros', name: 'Cuenta de Ahorros', type: 'Banco', color: '#3ACDFF', icon: <Landmark size={16} /> },
  { id: 'efectivo', name: 'Efectivo', type: 'Efectivo', color: '#FFB84D', icon: <HandCoins size={16} /> },
  { id: 'cuenta_objetivos', name: 'Cuenta Objetivos', type: 'Billetera Digital', color: '#8B5CF6', icon: <PiggyBank size={16} /> },
];

export const AccountsView: React.FC = () => {
  const { movimientos } = useFinance();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const balances = ACCOUNTS.map(acc => {
    let balance = 0;
    let income = 0;
    let expense = 0;
    movimientos.forEach(m => {
      if (m.type === 'ingreso' && m.accountId === acc.id) balance += m.amount;
      if (m.type === 'gasto' && m.accountId === acc.id) balance -= m.amount;
      if (m.type === 'transferencia') {
        if (m.accountId === acc.id) balance -= m.amount;
        if (m.targetAccountId === acc.id) balance += m.amount;
      }
      if (m.accountId === acc.id) {
        if (m.type === 'ingreso') income += m.amount;
        if (m.type === 'gasto') expense += m.amount;
      }
    });
    return { ...acc, balance, income, expense };
  });

  const totalBalance = balances.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="finance-view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 4px 0' }}>Cuentas</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
            Saldo total: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalBalance)}</strong>
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {balances.map(acc => (
          <Card key={acc.id} padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: `4px solid ${acc.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${acc.color}1A`, color: acc.color
                }}>
                  {acc.icon}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{acc.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{acc.type}</div>
                </div>
              </div>
              <Wallet size={16} color="var(--text-tertiary)" />
            </div>

            <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {formatCurrency(acc.balance)}
            </div>

            <div style={{ display: 'flex', gap: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--accent-green)' }}>
                <TrendingUp size={14} /> +{formatCurrency(acc.income)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--accent-red)' }}>
                <TrendingDown size={14} /> −{formatCurrency(acc.expense)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <RefreshCcw size={14} /> acumulado
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};