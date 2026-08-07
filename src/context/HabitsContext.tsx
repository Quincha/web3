import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { SyncQueueService } from '../services/SyncQueueService';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom';
export type HabitType = 'positive' | 'negative';

export interface HabitCompletion {
  date: string;       // "YYYY-MM-DD"
  timestamp: string;  // ISO full
  note?: string;
  isViolation?: boolean; // For negative habits: true if consumed/failed
}

export interface Habit {
  id: string;
  name: string;
  description: string;
  icon: string;              // emoji
  color: string;             // CSS color
  type?: HabitType;          // 'positive' (default) or 'negative' (avoidance/sobriety)
  frequency: HabitFrequency;
  targetDays: number[];      // 0=Sunday...6=Saturday
  completions: HabitCompletion[];
  startDate: string;         // "YYYY-MM-DD"
  archived: boolean;
  syncId: string | null;
}

// Computed at runtime (never stored)
export interface HabitWithStats extends Habit {
  completedToday: boolean;
  streak: number;
  bestStreak: number;
  completionRate30d: number; // 0-100
}

interface HabitsContextType {
  habits: Habit[];
  habitsWithStats: HabitWithStats[];

  // CRUD
  addHabit: (habit: Omit<Habit, 'id' | 'completions' | 'syncId'>) => string;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  archiveHabit: (id: string) => void;

  // Completion
  toggleHabitToday: (habitId: string, note?: string) => void;
  toggleHabitForDate: (habitId: string, dateISO: string, isViolation?: boolean, note?: string) => void;
  setHabitStateForDate: (habitId: string, dateISO: string, completed: boolean, isViolation?: boolean, note?: string) => void;

  // Queries
  getTodayHabits: () => HabitWithStats[];
  getActiveHabits: () => HabitWithStats[];
}

// ─────────────────────────────────────────────
// STREAK CALCULATION (pure, runtime only)
// ─────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function subtractDay(dateISO: string, days: number): string {
  const d = new Date(dateISO + 'T12:00:00');
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function calculateStreak(completions: HabitCompletion[]): { streak: number; bestStreak: number } {
  if (completions.length === 0) return { streak: 0, bestStreak: 0 };

  const dates = new Set(completions.map(c => c.date));
  const today = todayISO();

  // Current streak: count consecutive days back from today (or yesterday)
  let streak = 0;
  let checkDate = dates.has(today) ? today : subtractDay(today, 1);

  while (dates.has(checkDate)) {
    streak++;
    checkDate = subtractDay(checkDate, 1);
  }

  // Best streak: scan all dates
  const sorted = [...dates].sort();
  let best = 0, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00');
    const curr = new Date(sorted[i] + 'T12:00:00');
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  best = Math.max(best, current, streak);

  return { streak, bestStreak: best };
}

function completionRate30d(completions: HabitCompletion[], targetDays: number[]): number {
  const today = new Date();
  let eligible = 0, completed = 0;
  const dates = new Set(completions.map(c => c.date));

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayOfWeek = d.getDay();
    const isoDate = d.toISOString().split('T')[0];

    if (targetDays.includes(dayOfWeek)) {
      eligible++;
      if (dates.has(isoDate)) completed++;
    }
  }

  return eligible === 0 ? 0 : Math.round((completed / eligible) * 100);
}

function enrichHabit(habit: Habit): HabitWithStats {
  const { streak, bestStreak } = calculateStreak(habit.completions);
  const completedToday = habit.completions.some(c => c.date === todayISO());
  const rate = completionRate30d(habit.completions, habit.targetDays);
  return { ...habit, streak, bestStreak, completedToday, completionRate30d: rate };
}

// ─────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

// Generate past completions for realistic streaks
function mockCompletions(daysBack: number, skipDays: number[] = []): HabitCompletion[] {
  const completions: HabitCompletion[] = [];
  const today = new Date();

  for (let i = daysBack; i >= 0; i--) {
    if (skipDays.includes(i)) continue;
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateISO = d.toISOString().split('T')[0];
    completions.push({
      date: dateISO,
      timestamp: d.toISOString()
    });
  }
  return completions;
}

const INITIAL_HABITS: Habit[] = [
  {
    id: 'habit_water',
    name: 'Hidratación 2L',
    description: 'Tomar al menos 2 litros de agua durante el día',
    icon: '💧',
    color: '#3B82F6',
    frequency: 'daily',
    targetDays: [0, 1, 2, 3, 4, 5, 6],
    completions: mockCompletions(18, [3, 8, 15]),  // 15-day streak with some gaps
    startDate: subtractDay(todayISO(), 20),
    archived: false,
    syncId: null
  },
  {
    id: 'habit_meditation',
    name: 'Meditación 10 min',
    description: 'Sesión de mindfulness o respiración consciente',
    icon: '🧘',
    color: '#8B5CF6',
    frequency: 'daily',
    targetDays: [0, 1, 2, 3, 4, 5, 6],
    completions: mockCompletions(11, [5, 6]),  // 5-day streak
    startDate: subtractDay(todayISO(), 15),
    archived: false,
    syncId: null
  },
  {
    id: 'habit_reading',
    name: 'Lectura 30 min',
    description: 'Leer libros de no-ficción o técnicos',
    icon: '📚',
    color: '#F59E0B',
    frequency: 'daily',
    targetDays: [0, 1, 2, 3, 4, 5, 6],
    completions: mockCompletions(7, [2]),  // 7-day run mostly
    startDate: subtractDay(todayISO(), 30),
    archived: false,
    syncId: null
  },
  {
    id: 'habit_exercise',
    name: 'Ejercicio',
    description: 'Al menos 30 min de actividad física',
    icon: '🏃',
    color: '#10B981',
    frequency: 'weekdays',
    targetDays: [1, 2, 3, 4, 5],
    completions: mockCompletions(10, [1, 4, 7]),
    startDate: subtractDay(todayISO(), 21),
    archived: false,
    syncId: null
  },
  {
    id: 'habit_no_social',
    name: 'Sin redes antes de las 9am',
    description: 'No revisar Instagram/Twitter hasta después de las 9am',
    icon: '📵',
    color: '#EF4444',
    frequency: 'daily',
    targetDays: [0, 1, 2, 3, 4, 5, 6],
    completions: mockCompletions(5, [1, 3]),
    startDate: subtractDay(todayISO(), 14),
    archived: false,
    syncId: null
  }
];

// ─────────────────────────────────────────────
// CACHE HELPERS
// ─────────────────────────────────────────────

const CACHE_KEY = 'quincha_habits';

function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_HABITS;
  } catch { return INITIAL_HABITS; }
}

function saveHabits(habits: Habit[]): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(habits));
}

// ─────────────────────────────────────────────
// CONTEXT + PROVIDER
// ─────────────────────────────────────────────

const HabitsContext = createContext<HabitsContextType | undefined>(undefined);

export const HabitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [habits, setHabits] = useState<Habit[]>(() => loadHabits());

  // Compute enriched habits with stats (memoized, recalc only when habits change)
  const habitsWithStats = useMemo<HabitWithStats[]>(() => {
    return habits.map(enrichHabit);
  }, [habits]);

  // ── CRUD ───────────────────────────────────────────

  const addHabit = useCallback((habit: Omit<Habit, 'id' | 'completions' | 'syncId'>): string => {
    const id = genId('habit');
    const newHabit: Habit = { ...habit, id, completions: [], syncId: null };
    setHabits(prev => {
      const updated = [newHabit, ...prev];
      saveHabits(updated);
      return updated;
    });
    SyncQueueService.enqueue('CREATE_HABIT', { ...newHabit });
    return id;
  }, []);

  const updateHabit = useCallback((id: string, updates: Partial<Habit>) => {
    setHabits(prev => {
      const updated = prev.map(h => h.id === id ? { ...h, ...updates } : h);
      saveHabits(updated);
      return updated;
    });
  }, []);

  const deleteHabit = useCallback((id: string) => {
    setHabits(prev => {
      const updated = prev.filter(h => h.id !== id);
      saveHabits(updated);
      return updated;
    });
  }, []);

  const archiveHabit = useCallback((id: string) => {
    updateHabit(id, { archived: true });
    SyncQueueService.enqueue('ARCHIVE_HABIT', { id });
  }, [updateHabit]);

  // ── COMPLETION ─────────────────────────────────────

  const toggleHabitForDate = useCallback((habitId: string, dateISO: string, isViolation: boolean = false, note?: string) => {
    setHabits(prev => {
      const updated = prev.map(h => {
        if (h.id !== habitId) return h;
        const existing = h.completions.find(c => c.date === dateISO);
        let newCompletions;
        if (existing) {
          newCompletions = h.completions.filter(c => c.date !== dateISO);
        } else {
          newCompletions = [...h.completions, { date: dateISO, timestamp: new Date().toISOString(), isViolation, note }];
        }
        return { ...h, completions: newCompletions };
      });
      saveHabits(updated);
      return updated;
    });
    SyncQueueService.enqueue('TOGGLE_HABIT', { habitId, date: dateISO });
  }, []);

  const setHabitStateForDate = useCallback((habitId: string, dateISO: string, completed: boolean, isViolation: boolean = false, note?: string) => {
    setHabits(prev => {
      const updated = prev.map(h => {
        if (h.id !== habitId) return h;
        const filtered = h.completions.filter(c => c.date !== dateISO);
        const newCompletions = completed 
          ? [...filtered, { date: dateISO, timestamp: new Date().toISOString(), isViolation, note }]
          : filtered;
        return { ...h, completions: newCompletions };
      });
      saveHabits(updated);
      return updated;
    });
    SyncQueueService.enqueue('SET_HABIT_STATE', { habitId, date: dateISO, completed, isViolation });
  }, []);

  const toggleHabitToday = useCallback((habitId: string, note?: string) => {
    toggleHabitForDate(habitId, todayISO(), false, note);
  }, [toggleHabitForDate]);

  // ── QUERIES ────────────────────────────────────────

  const getTodayHabits = useCallback((): HabitWithStats[] => {
    const dayOfWeek = new Date().getDay();
    return habitsWithStats.filter(h =>
      !h.archived && h.targetDays.includes(dayOfWeek)
    );
  }, [habitsWithStats]);

  const getActiveHabits = useCallback((): HabitWithStats[] => {
    return habitsWithStats.filter(h => !h.archived);
  }, [habitsWithStats]);

  return (
    <HabitsContext.Provider value={{
      habits, habitsWithStats,
      addHabit, updateHabit, deleteHabit, archiveHabit,
      toggleHabitToday, toggleHabitForDate, setHabitStateForDate,
      getTodayHabits, getActiveHabits
    }}>
      {children}
    </HabitsContext.Provider>
  );
};

export const useHabits = () => {
  const ctx = useContext(HabitsContext);
  if (!ctx) throw new Error('useHabits must be used within a HabitsProvider');
  return ctx;
};
