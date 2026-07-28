import React from 'react';
import { Wallet, ArrowRight, TrendingUp, Calendar, CreditCard } from 'lucide-react';
import { useFinance } from '../../../context/FinanceContext';
import { tokens } from '../../../theme/tokens';
import { Button } from '../../ui/Button';

export const FinanceSummaryBanner: React.FC = () => {
  const { stats } = useFinance();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="premium-card-hover" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-primary)',
      borderRadius: '16px',
      padding: '24px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '32px'
    }}>
      {/* Left side: Icon & Text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '300px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'rgba(0, 208, 132, 0.1)',
          color: tokens.colors.accent.green,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid rgba(0, 208, 132, 0.2)`
        }}>
          <Wallet size={28} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              MÓDULO DE FINANZAS
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Controla tus finanzas, ingresos, gastos y deudas en un solo lugar.
          </p>
        </div>
      </div>

      {/* Middle: 4 Quick Indicators */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '40px', 
        flex: 1, 
        justifyContent: 'flex-start',
        borderLeft: '1px solid var(--border-primary)',
        paddingLeft: '40px'
      }}>
        {/* Available Balance */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ color: tokens.colors.accent.green, marginTop: '2px' }}>
            <Wallet size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '2px' }}>Saldo disponible</span>
            <span className="outfit" style={{ fontSize: '20px', fontWeight: 700, color: tokens.colors.accent.green, letterSpacing: '-0.02em' }}>
              {formatCurrency(stats.availableBalance)}
            </span>
          </div>
        </div>

        {/* Receivables */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ color: '#FCD34D', marginTop: '2px' }}>
            <TrendingUp size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '2px' }}>Por cobrar</span>
            <span className="outfit" style={{ fontSize: '20px', fontWeight: 600, color: '#FCD34D', letterSpacing: '-0.02em' }}>
              {formatCurrency(stats.totalReceivables)}
            </span>
          </div>
        </div>

        {/* Payables */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ color: tokens.colors.accent.danger, marginTop: '2px' }}>
            <CreditCard size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '2px' }}>Por pagar</span>
            <span className="outfit" style={{ fontSize: '20px', fontWeight: 600, color: tokens.colors.accent.danger, letterSpacing: '-0.02em' }}>
              {formatCurrency(stats.totalPayables)}
            </span>
          </div>
        </div>

        {/* Next Due */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
            <Calendar size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '2px' }}>Próximo vencimiento</span>
            <span className="outfit" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginTop: '2px' }}>
              Mañana
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Action Button */}
      <div style={{ flexShrink: 0 }}>
        <button 
          onClick={() => {
            const event = new CustomEvent('change-view', { detail: 'finanzas' });
            window.dispatchEvent(event);
          }}
          style={{
            background: tokens.colors.accent.green,
            color: '#000',
            border: 'none',
            borderRadius: '100px',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 208, 132, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Ir a Finanzas
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
