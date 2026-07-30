import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type BujoEntryType = 'task' | 'completed' | 'migrated' | 'scheduled' | 'note' | 'event';

export interface BujoEntry {
  id: string;
  type: BujoEntryType;
  content: string;
  date: string; // ISO date string (YYYY-MM-DD)
  timestamp: string; // Full ISO string for time
  tags: string[];
  pomodoroRef?: string; // Optional reference to a Pomodoro session
}

interface BujoContextType {
  entries: BujoEntry[];
  addEntry: (content: string, type: BujoEntryType, tags?: string[]) => void;
  updateEntry: (id: string, updates: Partial<BujoEntry>) => void;
  deleteEntry: (id: string) => void;
  toggleEntryType: (id: string) => void;
  getEntriesForDate: (date: string) => BujoEntry[];
  getTodayEntries: () => BujoEntry[];
}

const BujoContext = createContext<BujoContextType | undefined>(undefined);

const CACHE_KEY = 'quincha_bujo_entries';

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

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export const BujoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<BujoEntry[]>(() => loadFromCache());

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

  const toggleEntryType = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.map(e => {
        if (e.id !== id) return e;
        // Toggle between task and completed
        const newType: BujoEntryType = e.type === 'task' ? 'completed' : 'task';
        return { ...e, type: newType };
      });
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
      getEntriesForDate, getTodayEntries
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
