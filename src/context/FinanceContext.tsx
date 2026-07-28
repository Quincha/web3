import React, { createContext, useContext, useState } from 'react';
import type { 
  Cuenta, Movimiento, Deuda, FinanceDashboardStats, FinanceInsight 
} from '../types/finance';

interface FinanceContextType {
  stats: FinanceDashboardStats;
  cuentas: Cuenta[];
  movimientos: Movimiento[];
  deudas: Deuda[];
  insights: FinanceInsight[];
  addMovimiento: (mov: Omit<Movimiento, 'id'>) => void;
  markInsightAsRead: (id: string) => void;
}

const mockStats: FinanceDashboardStats = {
  availableBalance: 4820000,
  monthlyIncome: 3200000,
  monthlyIncomeVariation: 12,
  monthlyExpenses: 1950000,
  monthlyExpensesVariation: -6,
  monthlyResult: 1250000,
  totalReceivables: 980000,
  receivablesCount: 5,
  totalPayables: 620000,
  payablesCount: 3,
  nextDueCard: {
    name: 'Hosting AWS',
    dueDate: 'Mañana',
    amount: 48000
  }
};

const mockInsights: FinanceInsight[] = [
  { id: 'i1', type: 'warning', message: 'Tienes $430.000 vencidos hace 8 días.', date: new Date().toISOString(), read: false },
  { id: 'i2', type: 'info', message: 'Tus gastos en Combustible aumentaron 18%.', date: new Date().toISOString(), read: false },
  { id: 'i3', type: 'warning', message: 'Ya utilizaste el 90% del presupuesto de Marketing.', date: new Date().toISOString(), read: false },
  { id: 'i4', type: 'danger', message: 'Quedan 2 días para pagar el servidor.', date: new Date().toISOString(), read: false }
];

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats] = useState<FinanceDashboardStats>(mockStats);
  const [cuentas] = useState<Cuenta[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [deudas] = useState<Deuda[]>([]);
  const [insights, setInsights] = useState<FinanceInsight[]>(mockInsights);

  const addMovimiento = (mov: Omit<Movimiento, 'id'>) => {
    const newMov = { ...mov, id: Date.now().toString() };
    setMovimientos(prev => [newMov, ...prev]);
    // In a real app, we would update stats and cuentas balances here
  };

  const markInsightAsRead = (id: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, read: true } : i));
  };

  return (
    <FinanceContext.Provider value={{
      stats, cuentas, movimientos, deudas, insights, addMovimiento, markInsightAsRead
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
