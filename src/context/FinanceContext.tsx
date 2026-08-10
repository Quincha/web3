import React, { createContext, useContext, useState } from 'react';
import type { 
  Cuenta, Movimiento, Deuda, FinanceDashboardStats, FinanceInsight 
} from '../types/finance';
import { SyncQueueService } from '../services/SyncQueueService';

interface FinanceContextType {
  stats: FinanceDashboardStats;
  cuentas: Cuenta[];
  movimientos: Movimiento[];
  deudas: Deuda[];
  insights: FinanceInsight[];
  addMovimiento: (mov: Omit<Movimiento, 'id'>) => void;
  updateMovimiento: (id: string, updates: Partial<Movimiento>) => void;
  deleteMovimiento: (id: string) => void;
  addDeuda: (deuda: Omit<Deuda, 'id'>) => void;
  updateDeuda: (id: string, updates: Partial<Deuda>) => void;
  deleteDeuda: (id: string) => void;
  removeDeudaByTaskId: (taskId: string) => void;
  markInsightAsRead: (id: string) => void;
}

// Categorías por defecto con color e ícono simple
export const FINANCE_CATEGORIES: { id: string; name: string; type: 'ingreso' | 'gasto' | 'ambos'; color: string }[] = [
  { id: 'ventas', name: 'Ventas', type: 'ingreso', color: '#16F0B5' },
  { id: 'servicios', name: 'Servicios', type: 'ingreso', color: '#3ACDFF' },
  { id: 'otros_ingresos', name: 'Otros ingresos', type: 'ingreso', color: '#60A5FA' },
  { id: 'operaciones', name: 'Operaciones', type: 'gasto', color: '#F59E0B' },
  { id: 'marketing', name: 'Marketing', type: 'gasto', color: '#F43F5E' },
  { id: 'software', name: 'Software', type: 'gasto', color: '#8B5CF6' },
  { id: 'renta', name: 'Renta / Local', type: 'gasto', color: '#94A3B8' },
  { id: 'otros', name: 'Otros', type: 'ambos', color: '#64748B' },
];

export function financeCategoryLabel(id?: string): { name: string; color: string } {
  if (!id) return { name: 'Sin categoría', color: '#64748B' };
  const cat = FINANCE_CATEGORIES.find(c => c.id === id);
  return cat ? { name: cat.name, color: cat.color } : { name: id, color: '#64748B' };
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const CACHE_KEY = 'quincha_finance_movimientos_v2';
const CACHE_KEY_DEUDAS = 'quincha_finance_deudas_v2';

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
  let prevIncome = 0;
  let prevExpenses = 0;

  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  movs.forEach(m => {
    const d = new Date(m.date);
    const isCurrent = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    const isPrev = d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear();
    if (!isCurrent && !isPrev) return;
    if (m.type === 'ingreso') {
      if (isCurrent) income += m.amount;
      if (isPrev) prevIncome += m.amount;
    }
    if (m.type === 'gasto') {
      if (isCurrent) expenses += m.amount;
      if (isPrev) prevExpenses += m.amount;
    }
  });

  const pct = (cur: number, prev: number) => {
    if (prev === 0) return 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  const totalReceivables = deudas.filter(d => d.type === 'Por Cobrar' && d.status !== 'Pagada').reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
  const receivablesCount = deudas.filter(d => d.type === 'Por Cobrar' && d.status !== 'Pagada').length;

  const totalPayables = deudas.filter(d => d.type === 'Por Pagar' && d.status !== 'Pagada').reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
  const payablesCount = deudas.filter(d => d.type === 'Por Pagar' && d.status !== 'Pagada').length;

  // Próximo vencimiento: la deuda activa pendiente con la fecha más próxima
  const nextDueCard = deudas
    .filter(d => d.status !== 'Pagada')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const nextDue = nextDueCard ? {
    name: nextDueCard.entityName,
    dueDate: new Date(nextDueCard.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    amount: nextDueCard.amount - nextDueCard.paidAmount,
  } : undefined;

  return {
    availableBalance: income - expenses,
    monthlyIncome: income,
    monthlyIncomeVariation: pct(income, prevIncome),
    monthlyExpenses: expenses,
    monthlyExpensesVariation: pct(expenses, prevExpenses),
    monthlyResult: income - expenses,
    totalReceivables,
    receivablesCount,
    totalPayables,
    payablesCount,
    nextDueCard: nextDue,
  };
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cuentas] = useState<Cuenta[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>(() => loadMovimientosFromCache());
  const [deudas, setDeudas] = useState<Deuda[]>(() => loadDeudasFromCache());
  const [insights, setInsights] = useState<FinanceInsight[]>([]);
  
  const stats = computeStats(movimientos, deudas);

  const addMovimiento = (mov: Omit<Movimiento, 'id'>) => {
    const newMov: Movimiento = { ...mov, id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` };
    setMovimientos(prev => {
      const updated = [newMov, ...prev];
      saveMovimientosToCache(updated);
      return updated;
    });
    SyncQueueService.enqueue('CREATE_MOVIMIENTO', { ...newMov });
  };

  const updateMovimiento = (id: string, updates: Partial<Movimiento>) => {
    setMovimientos(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, ...updates } : m);
      saveMovimientosToCache(updated);
      return updated;
    });
    SyncQueueService.enqueue('UPDATE_MOVIMIENTO', { id, ...updates });
  };

  const deleteMovimiento = (id: string) => {
    setMovimientos(prev => {
      const updated = prev.filter(m => m.id !== id);
      saveMovimientosToCache(updated);
      return updated;
    });
    SyncQueueService.enqueue('DELETE_MOVIMIENTO', { id });
  };

  const addDeuda = (deuda: Omit<Deuda, 'id'>) => {
    const newDeuda: Deuda = { ...deuda, id: `deuda_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` };
    setDeudas(prev => {
      const updated = [newDeuda, ...prev];
      saveDeudasToCache(updated);
      return updated;
    });
    SyncQueueService.enqueue('CREATE_DEUDA', { ...newDeuda });
  };

  const updateDeuda = (id: string, updates: Partial<Deuda>) => {
    setDeudas(prev => {
      const updated = prev.map(d => d.id === id ? { ...d, ...updates } : d);
      saveDeudasToCache(updated);
      return updated;
    });
    SyncQueueService.enqueue('UPDATE_DEUDA', { id, ...updates });
  };

  const deleteDeuda = (id: string) => {
    setDeudas(prev => {
      const updated = prev.filter(d => d.id !== id);
      saveDeudasToCache(updated);
      return updated;
    });
    SyncQueueService.enqueue('DELETE_DEUDA', { id });
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
      stats, cuentas, movimientos, deudas, insights, addMovimiento, updateMovimiento, deleteMovimiento, addDeuda, updateDeuda, deleteDeuda, removeDeudaByTaskId, markInsightAsRead
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
