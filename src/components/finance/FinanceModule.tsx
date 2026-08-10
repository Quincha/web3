import React, { useState } from 'react';
import './Finance.css';
import { FinanceDashboard } from './dashboard/FinanceDashboard';
import { CashFlowView } from './cashflow/CashFlowView';
import { DebtsBalanceView } from './debts/DebtsBalanceView';
import { AccountsView } from './accounts/AccountsView';
import { BudgetsView } from './budgets/BudgetsView';
import { ReceiptsGallery } from './receipts/ReceiptsGallery';

type FinanceTab = 'dashboard' | 'flujo' | 'deudas' | 'cuentas' | 'presupuestos' | 'comprobantes';

export const FinanceModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');

  const tabs: { id: FinanceTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'flujo', label: 'Flujo de Caja' },
    { id: 'deudas', label: 'Deudas' },
    { id: 'cuentas', label: 'Cuentas' },
    { id: 'presupuestos', label: 'Presupuestos' },
    { id: 'comprobantes', label: 'Comprobantes' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <FinanceDashboard />;
      case 'flujo':
        return <CashFlowView />;
      case 'deudas':
        return <DebtsBalanceView />;
      case 'cuentas':
        return <AccountsView />;
      case 'presupuestos':
        return <BudgetsView />;
      case 'comprobantes':
        return <ReceiptsGallery />;
      default:
        return (
          <div className="finance-placeholder-view">
            <h3>{tabs.find(t => t.id === activeTab)?.label}</h3>
            <p>Sección en construcción...</p>
          </div>
        );
    }
  };

  return (
    <div className="finance-module-container">
      <div className="finance-header">
        <h1 className="finance-title">Finance & Treasury</h1>
        
        {/* Navigation Pills */}
        <div className="finance-nav-pills">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`finance-pill ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="finance-content-area">
        {renderTabContent()}
      </div>
    </div>
  );
};
