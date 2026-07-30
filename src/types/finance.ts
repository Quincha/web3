export type TransactionType = 'ingreso' | 'gasto' | 'transferencia';
export type TransactionStatus = 'Pendiente' | 'Emitida' | 'Parcial' | 'Pagada' | 'Cancelada' | 'Anulada' | 'Conciliado' | 'Con diferencia';

export interface Categoria {
  id: string;
  name: string;
  type: 'ingreso' | 'gasto' | 'ambos';
  color: string;
  icon?: string;
}

export interface Etiqueta {
  id: string;
  name: string;
  color: string;
}

export interface Cuenta {
  id: string;
  name: string;
  type: 'Efectivo' | 'Banco' | 'Tarjeta' | 'Billetera Digital';
  currency: string;
  balance: number;
  color: string;
  icon?: string;
  lastUpdate: string;
  status: 'Activa' | 'Inactiva';
}

export interface Movimiento {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  accountId: string; // origen en transferencias, cuenta destino/origen normal
  targetAccountId?: string; // destino en transferencias
  categoryId?: string; // no aplica en transferencias
  status: TransactionStatus;
  paymentMethod?: string;
  projectId?: string;
  clientId?: string; // ingresos
  providerId?: string; // gastos
  tags: string[]; // array de IDs
  attachments: string[]; // array de IDs o URLs de adjuntos
  reconciliationStatus: 'No Registrado' | 'Registrado' | 'Conciliado' | 'Con diferencia';
}

export interface Deuda {
  id: string;
  type: 'Por Cobrar' | 'Por Pagar';
  entityId: string; // clientId o providerId
  entityName: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: 'Pendiente' | 'Pagada' | 'Atrasada';
  priority?: 'Alta' | 'Media' | 'Baja';
  projectId?: string;
  tags: string[];
  originTaskId?: string; // Tarea que originó esta deuda
}

export interface Presupuesto {
  id: string;
  categoryId: string;
  amountLimit: number;
  period: 'Mensual' | 'Anual';
  spentAmount: number;
}

export interface GastoRecurrente {
  id: string;
  name: string;
  amount: number;
  frequency: 'Diario' | 'Semanal' | 'Mensual' | 'Anual';
  categoryId: string;
  providerId?: string;
  accountId: string;
  nextDueDate: string;
  active: boolean;
}

export interface FinanceInsight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'danger';
  message: string;
  date: string;
  read: boolean;
  relatedEntityId?: string; // id de un movimiento, cuenta, etc.
}

export interface FinanceDashboardStats {
  availableBalance: number;
  monthlyIncome: number;
  monthlyIncomeVariation: number; // porcentaje
  monthlyExpenses: number;
  monthlyExpensesVariation: number; // porcentaje
  monthlyResult: number;
  totalReceivables: number;
  receivablesCount: number;
  totalPayables: number;
  payablesCount: number;
  nextDueCard?: {
    name: string;
    dueDate: string;
    amount: number;
  };
}
