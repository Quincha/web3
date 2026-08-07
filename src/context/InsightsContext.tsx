import React, { createContext, useContext, useState,  useMemo } from 'react';
import { useHealth } from './HealthContext';
import { useTasks } from './TasksContext';
import { useHabits } from './HabitsContext';

export interface ProactiveInsight {
  id: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  module: 'health' | 'tasks' | 'habits' | 'general';
  title: string;
  message: string;
  actionLabel?: string;
  actionView?: string;
  createdAt: string;
}

interface InsightsContextType {
  insights: ProactiveInsight[];
  dismissInsight: (id: string) => void;
}

const InsightsContext = createContext<InsightsContextType | undefined>(undefined);

export const InsightsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { medications, getUpcomingAppointments } = useHealth();
  const { tasks } = useTasks();
  const { habitsWithStats } = useHabits();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Proactive inference engine running on context dependencies
  const generatedInsights = useMemo<ProactiveInsight[]>(() => {
    const list: ProactiveInsight[] = [];
    const nowStr = new Date().toISOString();

    // 1. HEALTH CHECKS — Critical stock level
    medications.forEach(med => {
      const pct = med.stockRemaining / med.stockTotal;
      if (pct <= 0.2) {
        list.push({
          id: `ins_health_stock_${med.id}`,
          type: 'danger',
          module: 'health',
          title: `Stock crítico: ${med.name}`,
          message: `Quedan solo ${med.stockRemaining} de ${med.stockTotal} dosis. Solicita una nueva receta pronto.`,
          actionLabel: 'Ver Ficha Médica',
          actionView: 'health',
          createdAt: nowStr
        });
      } else if (pct <= 0.4) {
        list.push({
          id: `ins_health_stock_warning_${med.id}`,
          type: 'warning',
          module: 'health',
          title: `Stock bajo: ${med.name}`,
          message: `Quedan ${med.stockRemaining} dosis en inventario.`,
          actionLabel: 'Ver Ficha Médica',
          actionView: 'health',
          createdAt: nowStr
        });
      }
    });

    // 2. HEALTH CHECKS — Appointments in < 48 hours
    const upcoming = getUpcomingAppointments(2);
    if (upcoming.length > 0) {
      upcoming.forEach(appt => {
        list.push({
          id: `ins_health_appt_${appt.id}`,
          type: 'info',
          module: 'health',
          title: `Cita médica inminente`,
          message: `Recuerda: ${appt.specialty} con ${appt.professional} en ${appt.clinic} pronto.`,
          actionLabel: 'Ver Cita',
          actionView: 'health',
          createdAt: nowStr
        });
      });
    }

    // 3. HABITS CHECKS — Streak maintenance warnings
    habitsWithStats.forEach(h => {
      if (!h.completedToday && h.streak > 2) {
        list.push({
          id: `ins_habits_streak_${h.id}`,
          type: 'warning',
          module: 'habits',
          title: `Protege tu racha: ${h.name}`,
          message: `Llevas una racha de ${h.streak} días. ¡Complétalo hoy para no perderla!`,
          actionLabel: 'Marcar Hábito',
          actionView: 'habitos',
          createdAt: nowStr
        });
      }
    });

    // 4. PRODUCTIVITY CHECKS — Urgent task cold state
    const coldTasks = tasks.filter(t => 
      t.priority === 'urgent' && 
      t.status === 'pending' && 
      t.completedPomodoros === 0
    );

    if (coldTasks.length > 0) {
      coldTasks.slice(0, 2).forEach(t => {
        list.push({
          id: `ins_tasks_cold_${t.id}`,
          type: 'warning',
          module: 'tasks',
          title: `Tarea urgente sin iniciar`,
          message: `"${t.title}" está marcada como urgente. ¿Iniciamos una sesión Pomodoro para avanzar?`,
          actionLabel: 'Ir a Tareas',
          actionView: 'tareas',
          createdAt: nowStr
        });
      });
    }

    // Default info insight if queue is empty
    if (list.length === 0) {
      list.push({
        id: 'ins_default_ok',
        type: 'success',
        module: 'general',
        title: 'Todo al día',
        message: 'No se detectan alertas ni anomalías en tus rutinas de salud o productividad.',
        createdAt: nowStr
      });
    }

    return list;
  }, [medications, getUpcomingAppointments, tasks, habitsWithStats]);

  // Filter out manually dismissed insights
  const activeInsights = useMemo(() => {
    return generatedInsights.filter(ins => !dismissedIds.includes(ins.id));
  }, [generatedInsights, dismissedIds]);

  const dismissInsight = (id: string) => {
    setDismissedIds(prev => [...prev, id]);
  };

  return (
    <InsightsContext.Provider value={{ insights: activeInsights, dismissInsight }}>
      {children}
    </InsightsContext.Provider>
  );
};

export const useInsights = () => {
  const ctx = useContext(InsightsContext);
  if (!ctx) throw new Error('useInsights must be used within an InsightsProvider');
  return ctx;
};
