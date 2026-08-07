import React from 'react';
import { Wallet, TrendingUp, CreditCard, CalendarClock } from 'lucide-react';
import { useFinance } from '../../../context/FinanceContext';
import { tokens } from '../../../theme/tokens';
import { Button } from '../../ui/Button';

const fmtCLP = (n: number): string =>
  `$${Math.round(n).toLocaleString('es-CL')}`;

export const FinanceSummaryBanner: React.FC = () => {
  const { stats } = useFinance();

  const goToFinance = () => {
    window.dispatchEvent(new CustomEvent('change-view', { detail: 'finanzas' }));
    window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: 'finanzas' }));
  };

  return (
    <div className="premium-card-hover" style={{
      background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 27, 75, 0.85) 100%)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(56, 189, 248, 0.2)',
      borderRadius: '20px',
      padding: '24px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '32px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
    }}>
      {/* Left side: Icon & Text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '300px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'rgba(56, 189, 248, 0.15)',
          color: '#38BDF8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid rgba(56, 189, 248, 0.3)`
        }}>
          <Wallet size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '4px', letterSpacing: '0.05em' }}>MÓDULO DE FINANZAS</h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Controla tus finanzas, ingresos, gastos y deudas en un solo lugar.</p>
        </div>
      </div>

      {/* Center: Quick Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '48px', flex: 1, paddingLeft: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
            <Wallet size={14} /> Saldo disponible
          </div>
          <span style={{ fontSize: '20px', fontWeight: 700, color: tokens.colors.accent.green }}>
            {fmtCLP(stats.availableBalance)}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
            <TrendingUp size={14} /> Por cobrar
          </div>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#38BDF8' }}>
            {fmtCLP(stats.totalReceivables)}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
            <CreditCard size={14} /> Por pagar
          </div>
          <span style={{ fontSize: '20px', fontWeight: 700, color: tokens.colors.accent.danger }}>
            {fmtCLP(stats.totalPayables)}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
            <CalendarClock size={14} /> Próximo vencimiento
          </div>
          {stats.nextDueCard ? (
            <>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                {fmtCLP(stats.nextDueCard.amount)} · {stats.nextDueCard.dueDate}
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{stats.nextDueCard.name}</span>
            </>
          ) : (
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>—</span>
          )}
        </div>
      </div>

      {/* Right side: Action */}
      <div style={{ flexShrink: 0 }}>
        <Button
          variant="primary"
          onClick={goToFinance}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#fff',
            fontWeight: 500,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '12px 24px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
        >
          Ir a Finanzas →
        </Button>
      </div>
    </div>
  );
};