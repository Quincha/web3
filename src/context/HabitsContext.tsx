import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { SyncQueueService } from '../services/SyncQueueService';
import { DataSyncService } from '../services/DataSyncService';

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
  currentMonthCount: number; // veces registradas en el mes actual (hábitos positivos y negativos)
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

function pad(n: number): string { return String(n).padStart(2, '0'); }

function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISO(dateISO: string): Date {
  return new Date(dateISO + 'T12:00:00');
}

function todayISO(): string {
  return toLocalISO(new Date());
}

function subtractDay(dateISO: string, days: number): string {
  const d = parseISO(dateISO);
  d.setDate(d.getDate() - days);
  return toLocalISO(d);
}

function calculateStreak(habit: Habit): { streak: number; bestStreak: number } {
  const dates = new Set(habit.completions.map(c => c.date));
  const today = todayISO();
  const daysFromStart = Math.max(0, Math.round((parseISO(today).getTime() - parseISO(habit.startDate).getTime()) / 86400000));
  const totalDays = Math.min(364, daysFromStart);

  if (habit.type === 'negative') {
    // For negative habits, streak is days SINCE last violation.
    let current = 0;
    for (let i = 0; i <= totalDays; i++) {
      if (dates.has(subtractDay(today, i))) break;
      current++;
    }
    let best = 0;
    let run = 0;
    for (let i = totalDays; i >= 0; i--) {
      if (dates.has(subtractDay(today, i))) {
        run = 0;
      } else {
        run++;
        if (run > best) best = run;
      }
    }
    return { streak: current, bestStreak: best };
  }

  // Positive habit: walk each day from startDate to today, local timezone-safe.
  // A day counts toward the streak only if it is a target day and was completed.
  let current = 0;
  let best = 0;
  for (let i = totalDays; i >= 0; i--) {
    const iso = subtractDay(today, i);
    const isToday = i === 0;
    const isTarget = habit.targetDays.includes(parseISO(iso).getDay());
    const isDone = dates.has(iso);

    if (isDone && isTarget) {
      current++;
    } else if (!isDone && isTarget && !isToday) {
      // Missed a past target day. Streak broken.
      current = 0;
    }
    if (current > best) best = current;
  }

  return { streak: current, bestStreak: best };
}

function completionRate30d(completions: HabitCompletion[], targetDays: number[]): number {
  const today = new Date();
  let eligible = 0, completed = 0;
  const dates = new Set(completions.map(c => c.date));

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayOfWeek = d.getDay();
    const isoDate = toLocalISO(d);

    if (targetDays.includes(dayOfWeek)) {
      eligible++;
      if (dates.has(isoDate)) completed++;
    }
  }

  return eligible === 0 ? 0 : Math.round((completed / eligible) * 100);
}

function countInCurrentMonth(completions: HabitCompletion[], onlyViolations: boolean = false): number {
  const now = new Date();
  return completions.filter(c => {
    if (onlyViolations && c.isViolation !== true) return false;
    const d = parseISO(c.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
}

function enrichHabit(habit: Habit): HabitWithStats {
  const { streak, bestStreak } = calculateStreak(habit);
  const completedToday = habit.completions.some(c => c.date === todayISO());
  const rate = completionRate30d(habit.completions, habit.targetDays);
  const onlyViolations = habit.type === 'negative';
  const currentMonthCount = countInCurrentMonth(habit.completions, onlyViolations);
  return { ...habit, streak, bestStreak, completedToday, completionRate30d: rate, currentMonthCount };
}

// ─────────────────────────────────────────────
// CACHE HELPERS
// ─────────────────────────────────────────────

const CACHE_KEY = 'quincha_habits_v2';

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHabits(habits: Habit[]): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(habits));
  DataSyncService.markDirty('habits');
}

// ─────────────────────────────────────────────
// CONTEXT + PROVIDER
// ─────────────────────────────────────────────

const HabitsContext = createContext<HabitsContextType | undefined>(undefined);

export const HabitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [habits, setHabits] = useState<Habit[]>(() => loadHabits());

  // Restaura datos bajados del servidor (pull) al cambiar de equipo.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { data?: { habits?: Habit[] } } | undefined;
      const data = detail?.data;
      if (!data || !Array.isArray(data.habits)) return;
      setHabits(data.habits);
      saveHabits(data.habits);
    };
    window.addEventListener('quincha-restore:habits', handler);
    return () => window.removeEventListener('quincha-restore:habits', handler);
  }, []);

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
