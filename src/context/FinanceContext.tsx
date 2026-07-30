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
  addDeuda: (deuda: Omit<Deuda, 'id'>) => void;
  removeDeudaByTaskId: (taskId: string) => void;
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

const CACHE_KEY = 'quincha_finance_movimientos';
const CACHE_KEY_DEUDAS = 'quincha_finance_deudas';

function loadMovimientosFromCache(): Movimiento[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMovimientosToCache(movs: Movimiento[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(movs));
}

function loadDeudasFromCache(): Deuda[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY_DEUDAS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDeudasToCache(deudas: Deuda[]) {
  localStorage.setItem(CACHE_KEY_DEUDAS, JSON.stringify(deudas));
}

const computeStats = (movs: Movimiento[], deudas: Deuda[]): FinanceDashboardStats => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let income = 0;
  let expenses = 0;
  
  movs.forEach(m => {
    const d = new Date(m.date);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      if (m.type === 'ingreso') income += m.amount;
      if (m.type === 'gasto') expenses += m.amount;
    }
  });

  const totalReceivables = deudas.filter(d => d.type === 'Por Cobrar' && d.status !== 'Pagada').reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
  const receivablesCount = deudas.filter(d => d.type === 'Por Cobrar' && d.status !== 'Pagada').length;

  const totalPayables = deudas.filter(d => d.type === 'Por Pagar' && d.status !== 'Pagada').reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
  const payablesCount = deudas.filter(d => d.type === 'Por Pagar' && d.status !== 'Pagada').length;

  // Static mock base + computed for demo purposes
  const baseBalance = 4820000; 

  return {
    ...mockStats, // carry over static variations/nextDueCard
    availableBalance: baseBalance + income - expenses,
    monthlyIncome: income,
    monthlyExpenses: expenses,
    monthlyResult: income - expenses,
    totalReceivables: totalReceivables || mockStats.totalReceivables,
    receivablesCount: receivablesCount || mockStats.receivablesCount,
    totalPayables: totalPayables || mockStats.totalPayables,
    payablesCount: payablesCount || mockStats.payablesCount,
  };
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cuentas] = useState<Cuenta[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>(() => loadMovimientosFromCache());
  const [deudas, setDeudas] = useState<Deuda[]>(() => loadDeudasFromCache());
  const [insights, setInsights] = useState<FinanceInsight[]>(mockInsights);
  
  const stats = computeStats(movimientos, deudas);

  const addMovimiento = (mov: Omit<Movimiento, 'id'>) => {
    const newMov: Movimiento = { ...mov, id: Date.now().toString() } as Movimiento;
    setMovimientos(prev => {
      const updated = [newMov, ...prev];
      saveMovimientosToCache(updated);
      return updated;
    });
  };

  const addDeuda = (deuda: Omit<Deuda, 'id'>) => {
    const newDeuda: Deuda = { ...deuda, id: Date.now().toString() };
    setDeudas(prev => {
      const updated = [newDeuda, ...prev];
      saveDeudasToCache(updated);
      return updated;
    });
  };

  const removeDeudaByTaskId = (taskId: string) => {
    setDeudas(prev => {
      const updated = prev.filter(d => d.originTaskId !== taskId);
      saveDeudasToCache(updated);
      return updated;
    });
  };

  const markInsightAsRead = (id: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, read: true } : i));
  };

  return (
    <FinanceContext.Provider value={{
      stats, cuentas, movimientos, deudas, insights, addMovimiento, addDeuda, removeDeudaByTaskId, markInsightAsRead
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
