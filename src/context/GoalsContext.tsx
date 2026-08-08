import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type GoalTimeframe = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type GoalStatus = 'active' | 'completed' | 'abandoned';

export interface Goal {
  id: string;
  title: string;
  description: string;
  timeframe: GoalTimeframe;
  progress: number; // 0 to 100
  status: GoalStatus;
  createdAt: string;
  completedAt?: string;
}

interface GoalsContextType {
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'status' | 'progress'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  updateProgress: (id: string, progress: number) => void;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

const CACHE_KEY = 'quincha_goals_v2';

export const GoalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [goals, setGoals] = useState<Goal[]>([]);

  // Load from cache on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        setGoals(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveToCache = (newGoals: Goal[]) => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(newGoals));
  };

  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'createdAt' | 'status' | 'progress'>) => {
    setGoals(prev => {
      const newGoal: Goal = {
        ...goal,
        id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        status: 'active',
        progress: 0,
        createdAt: new Date().toISOString()
      };
      const updated = [newGoal, ...prev];
      saveToCache(updated);
      return updated;
    });
  }, []);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    setGoals(prev => {
      const updated = prev.map(g => {
        if (g.id === id) {
          const merged = { ...g, ...updates };
          if (merged.progress >= 100 && merged.status !== 'completed') {
            merged.status = 'completed';
            merged.completedAt = new Date().toISOString();
          } else if (merged.progress < 100 && merged.status === 'completed') {
            merged.status = 'active';
            merged.completedAt = undefined;
          }
          return merged;
        }
        return g;
      });
      saveToCache(updated);
      return updated;
    });
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => {
      const updated = prev.filter(g => g.id !== id);
      saveToCache(updated);
      return updated;
    });
  }, []);

  const updateProgress = useCallback((id: string, progress: number) => {
    const safeProgress = Math.max(0, Math.min(100, progress));
    updateGoal(id, { progress: safeProgress });
  }, [updateGoal]);

  return (
    <GoalsContext.Provider value={{ goals, addGoal, updateGoal, deleteGoal, updateProgress }}>
      {children}
    </GoalsContext.Provider>
  );
};

export const useGoals = () => {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error('useGoals must be used within a GoalsProvider');
  return ctx;
};
