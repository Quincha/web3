import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type BujoEntryType = 'task' | 'completed' | 'migrated' | 'scheduled' | 'note' | 'event' | 'cancelled';

export interface BujoEntry {
  id: string;
  type: BujoEntryType;
  content: string;
  date: string; // ISO date string (YYYY-MM-DD)
  timestamp: string; // Full ISO string for time
  tags: string[];
  pomodoroRef?: string; // Optional reference to a Pomodoro session
  isFavorite?: boolean;
}

interface BujoContextType {
  entries: BujoEntry[];
  addEntry: (content: string, type: BujoEntryType, tags?: string[]) => void;
  updateEntry: (id: string, updates: Partial<BujoEntry>) => void;
  deleteEntry: (id: string) => void;
  toggleEntryType: (id: string, newType?: BujoEntryType) => void;
  toggleFavorite: (id: string) => void;
  getEntriesForDate: (date: string) => BujoEntry[];
  getTodayEntries: () => BujoEntry[];
  dailyMoods: Record<string, number>;
  getDailyMood: (date: string) => number | null;
  setDailyMood: (date: string, score: number) => void;
}

const BujoContext = createContext<BujoContextType | undefined>(undefined);

const CACHE_KEY = 'quincha_bujo_entries';
const MOOD_CACHE_KEY = 'quincha_bujo_moods';

function loadFromCache(): BujoEntry[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToCache(entries: BujoEntry[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
}

function loadMoodsFromCache(): Record<string, number> {
  try {
    const raw = localStorage.getItem(MOOD_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMoodsToCache(moods: Record<string, number>) {
  localStorage.setItem(MOOD_CACHE_KEY, JSON.stringify(moods));
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export const BujoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<BujoEntry[]>(() => loadFromCache());
  const [dailyMoods, setDailyMoods] = useState<Record<string, number>>(() => loadMoodsFromCache());

  const addEntry = useCallback((content: string, type: BujoEntryType, tags: string[] = []) => {
    const newEntry: BujoEntry = {
      id: `bujo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      content,
      date: todayISO(),
      timestamp: new Date().toISOString(),
      tags,
    };
    setEntries(prev => {
      const updated = [newEntry, ...prev];
      saveToCache(updated);
      return updated;
    });
  }, []);

  const updateEntry = useCallback((id: string, updates: Partial<BujoEntry>) => {
    setEntries(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      saveToCache(updated);
      return updated;
    });
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      saveToCache(updated);
      return updated;
    });
  }, []);

  const toggleEntryType = useCallback((id: string, forceType?: BujoEntryType) => {
    setEntries(prev => {
      const updated = prev.map(e => {
        if (e.id !== id) return e;
        const newType: BujoEntryType = forceType || (e.type === 'task' ? 'completed' : 'task');
        return { ...e, type: newType };
      });
      saveToCache(updated);
      return updated;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, isFavorite: !e.isFavorite } : e);
      saveToCache(updated);
      return updated;
    });
  }, []);

  const getEntriesForDate = useCallback((date: string) => {
    return entries.filter(e => e.date === date);
  }, [entries]);

  const getTodayEntries = useCallback(() => {
    return getEntriesForDate(todayISO());
  }, [getEntriesForDate]);

  const getDailyMood = useCallback((date: string) => {
    return dailyMoods[date] || null;
  }, [dailyMoods]);

  const setDailyMood = useCallback((date: string, score: number) => {
    setDailyMoods(prev => {
      const updated = { ...prev, [date]: score };
      saveMoodsToCache(updated);
      return updated;
    });
  }, []);

  useEffect(() => {
    const handleBujoEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.content && customEvent.detail.type) {
        addEntry(customEvent.detail.content, customEvent.detail.type);
      }
    };
    window.addEventListener('bujo-add-entry', handleBujoEvent);
    return () => window.removeEventListener('bujo-add-entry', handleBujoEvent);
  }, [addEntry]);

  return (
    <BujoContext.Provider value={{
      entries, addEntry, updateEntry, deleteEntry, toggleEntryType,
      toggleFavorite,
      getEntriesForDate, getTodayEntries,
      dailyMoods, getDailyMood, setDailyMood
    }}>
      {children}
    </BujoContext.Provider>
  );
};

export const useBujo = () => {
  const ctx = useContext(BujoContext);
  if (!ctx) throw new Error('useBujo must be used within a BujoProvider');
  return ctx;
};
