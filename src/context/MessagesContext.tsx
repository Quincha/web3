import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useTasks } from './TasksContext';
import { useHabits } from './HabitsContext';
import { useHealth } from './HealthContext';
import { useFinance } from './FinanceContext';
import { useInsights } from './InsightsContext';

export interface Message {
  id: string;
  sender: string;
  company: string;
  text: string;
  time: string;
  unread: boolean;
}

export interface Notification {
  id: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  desc: string;
  time: string;
  view?: string;
}

interface MessagesContextType {
  messages: Message[];
  notifications: Notification[];
  unreadMessages: number;
  markMessageRead: (id: string) => void;
  markAllMessagesRead: () => void;
  addMessage: (text: string, sender?: string, company?: string) => void;
  markNotificationRead: (id: string) => void;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

const MESSAGES_KEY = 'quincha_messages';
const READ_NOTIFS_KEY = 'quincha_read_notifications';

const SEED_MESSAGES: Message[] = [
  { id: 'm1', sender: 'Roberto Gómez', company: 'GALTEC', text: 'Hola Daniel, te envié la aprobación del presupuesto.', time: 'Hace 15 min', unread: true },
  { id: 'm2', sender: 'Ana Martínez', company: 'EcoVertical', text: '¿Podemos mover la reunión de revisión a las 15:00?', time: 'Hace 1 hora', unread: true },
];

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return SEED_MESSAGES;
}

function loadReadIds(): string[] {
  try {
    const raw = localStorage.getItem(READ_NOTIFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [readNotifIds, setReadNotifIds] = useState<string[]>(loadReadIds);

  const { tasks } = useTasks();
  const { habitsWithStats } = useHabits();
  const { medications, getUpcomingAppointments } = useHealth();
  const { insights: financeInsights } = useFinance();
  const { insights: proactiveInsights } = useInsights();

  useEffect(() => {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(readNotifIds));
  }, [readNotifIds]);

  // ── DERIVED NOTIFICATIONS (real data) ──
  const derivedNotifications = useMemo<Notification[]>(() => {
    const list: Notification[] = [];

    // Finance insights (unread)
    financeInsights.forEach(ins => {
      list.push({
        id: `fin_${ins.id}`,
        type: ins.type,
        title: 'Finanzas',
        desc: ins.message,
        time: ins.read ? 'Leído' : 'Nuevo',
        view: 'finanzas',
      });
    });

    // Health — appointments soon
    const upcoming = getUpcomingAppointments(7);
    upcoming.forEach(appt => {
      list.push({
        id: `health_appt_${appt.id}`,
        type: 'info',
        title: 'Cita médica',
        desc: `${appt.specialty} · ${appt.professional} en ${appt.clinic}`,
        time: 'Próximamente',
        view: 'health',
      });
    });

    // Health — low stock
    medications.forEach(med => {
      const pct = med.stockRemaining / med.stockTotal;
      if (pct <= 0.4) {
        list.push({
          id: `health_stock_${med.id}`,
          type: pct <= 0.2 ? 'danger' : 'warning',
          title: 'Stock de medicamentos',
          desc: `${med.name}: quedan ${med.stockRemaining} de ${med.stockTotal} dosis.`,
          time: 'Inventario',
          view: 'health',
        });
      }
    });

    // Habits — active streak
    habitsWithStats.forEach(h => {
      if (!h.completedToday && h.streak > 2) {
        list.push({
          id: `habit_${h.id}`,
          type: 'success',
          title: 'Racha de hábitos',
          desc: `¡Llevas ${h.streak} días en ${h.name}!`,
          time: 'Hábitos',
          view: 'habitos',
        });
      }
    });

    // Tasks — urgent pending or overdue
    const tasksDueToday = tasks.filter(t =>
      t.status !== 'completed' && t.status !== 'cancelled' &&
      (t.priority === 'urgent' || (t.dueDate !== null && t.dueDate <= new Date().toISOString().split('T')[0]))
    );
    tasksDueToday.slice(0, 3).forEach(t => {
      list.push({
        id: `task_${t.id}`,
        type: t.priority === 'urgent' ? 'warning' : 'info',
        title: t.priority === 'urgent' ? 'Tarea urgente' : 'Tarea con fecha',
        desc: t.title,
        time: 'Pendiente',
        view: 'tareas',
      });
    });

    // Proactive insights (mirror as notifications too)
    proactiveInsights.forEach(ins => {
      list.push({
        id: `ins_${ins.id}`,
        type: ins.type,
        title: ins.title,
        desc: ins.message,
        time: 'Ahora',
        view: ins.actionView,
      });
    });

    return list;
  }, [financeInsights, getUpcomingAppointments, medications, habitsWithStats, tasks, proactiveInsights]);

  const notifications = derivedNotifications.filter(n => !readNotifIds.includes(n.id));
  const unreadMessages = messages.filter(m => m.unread).length;

  const markMessageRead = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, unread: false } : m));
  }, []);

  const markAllMessagesRead = useCallback(() => {
    setMessages(prev => prev.map(m => ({ ...m, unread: false })));
  }, []);

  const addMessage = useCallback((text: string, sender: string = 'Tú', company: string = 'Quincha') => {
    const msg: Message = {
      id: `msg_${Date.now()}`,
      sender,
      company,
      text,
      time: 'Justo ahora',
      unread: true,
    };
    setMessages(prev => [msg, ...prev]);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setReadNotifIds(prev => [...prev, id]);
  }, []);

  return (
    <MessagesContext.Provider value={{
      messages, notifications, unreadMessages,
      markMessageRead, markAllMessagesRead, addMessage, markNotificationRead,
    }}>
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = () => {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used within a MessagesProvider');
  return ctx;
};