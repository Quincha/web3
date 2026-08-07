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
  duration?: string;
  assignee?: string;
}

export interface BujoCheckIn {
  date: string;               // ISO YYYY-MM-DD
  dayRating?: number;         // 1 to 5 stars
  energyLevel?: number;       // 1 to 10 scale
  medsTaken?: boolean;        // "¿Tomaste tus medicamentos?"
  readBook?: boolean;         // "¿Leíste tu libro actual?"
  exercised?: boolean;        // "¿Hiciste ejercicio?"
  drankAlcohol?: boolean;     // "¿Bebiste alcohol hoy?"
  notes?: string;             // Reflexión o notas rápidas del día
  timestamp?: string;
}

interface BujoContextType {
  entries: BujoEntry[];
  addEntry: (content: string, type: BujoEntryType, tags?: string[], duration?: string, assignee?: string, date?: string) => void;
  addOrUpdateReflectionEntry: (date: string, reflectionText: string) => void;
  updateEntry: (id: string, updates: Partial<BujoEntry>) => void;
  deleteEntry: (id: string) => void;
  toggleEntryType: (id: string, newType?: BujoEntryType) => void;
  toggleFavorite: (id: string) => void;
  getEntriesForDate: (date: string) => BujoEntry[];
  getTodayEntries: () => BujoEntry[];
  dailyMoods: Record<string, number>;
  getDailyMood: (date: string) => number | null;
  setDailyMood: (date: string, score: number) => void;
  
  // Daily Check-in System
  checkIns: Record<string, BujoCheckIn>;
  getCheckIn: (date: string) => BujoCheckIn | null;
  saveCheckIn: (checkIn: BujoCheckIn) => void;
}

const BujoContext = createContext<BujoContextType | undefined>(undefined);

const CACHE_KEY = 'quincha_bujo_entries';
const MOOD_CACHE_KEY = 'quincha_bujo_moods';
const CHECKIN_CACHE_KEY = 'quincha_bujo_checkins';

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

function loadCheckInsFromCache(): Record<string, BujoCheckIn> {
  try {
    const raw = localStorage.getItem(CHECKIN_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCheckInsToCache(checkIns: Record<string, BujoCheckIn>) {
  localStorage.setItem(CHECKIN_CACHE_KEY, JSON.stringify(checkIns));
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export const BujoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<BujoEntry[]>(() => loadFromCache());
  const [dailyMoods, setDailyMoods] = useState<Record<string, number>>(() => loadMoodsFromCache());
  const [checkIns, setCheckIns] = useState<Record<string, BujoCheckIn>>(() => loadCheckInsFromCache());

  const getCheckIn = useCallback((date: string): BujoCheckIn | null => {
    return checkIns[date] || null;
  }, [checkIns]);

  const saveCheckIn = useCallback((checkIn: BujoCheckIn) => {
    setCheckIns(prev => {
      const updated = {
        ...prev,
        [checkIn.date]: {
          ...(prev[checkIn.date] || {}),
          ...checkIn,
          timestamp: new Date().toISOString()
        }
      };
      saveCheckInsToCache(updated);
      return updated;
    });

    if (checkIn.energyLevel !== undefined) {
      setDailyMoods(prev => {
        const updated = { ...prev, [checkIn.date]: checkIn.energyLevel! };
        saveMoodsToCache(updated);
        return updated;
      });
    }
  }, []);

  const addEntry = useCallback((content: string, type: BujoEntryType, tags: string[] = [], initialDuration?: string, initialAssignee?: string, date?: string) => {
    let parsedContent = content.trim();
    let duration = initialDuration;
    let assignee = initialAssignee;
    const tagsSet = new Set<string>(tags);

    // Parse duration: e.g. "(60 min)" or "[60 min]" or "60 min" (if at the end)
    const durationMatch = parsedContent.match(/[\(\[](?:(\d+\s*(?:min|h|m|horas|minutos))|(\d+m))[\)\]]/i);
    if (durationMatch) {
      duration = durationMatch[1] || durationMatch[2];
      parsedContent = parsedContent.replace(durationMatch[0], '').trim();
    }

    // Parse assignee: e.g. "@Felipe" or "@Felipe González"
    const assigneeMatch = parsedContent.match(/@([a-zA-ZáéíóúÁÉÍÓÚñÑ]+(?:\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ]+)?)/);
    if (assigneeMatch) {
      assignee = assigneeMatch[1].trim();
      parsedContent = parsedContent.replace(assigneeMatch[0], '').trim();
    }

    // Parse hashtags: e.g. "#Trabajo"
    const hashTags = parsedContent.match(/#([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9_-]+)/g);
    if (hashTags) {
      hashTags.forEach(tag => {
        tagsSet.add(tag.substring(1));
        parsedContent = parsedContent.replace(tag, '').trim();
      });
    }

    const targetDate = date || todayISO();

    const newEntry: BujoEntry = {
      id: `bujo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      content: parsedContent,
      date: targetDate,
      timestamp: new Date().toISOString(),
      tags: Array.from(tagsSet),
      duration,
      assignee,
    };
    setEntries(prev => {
      const updated = [newEntry, ...prev];
      saveToCache(updated);
      return updated;
    });
  }, []);

  const addOrUpdateReflectionEntry = useCallback((date: string, reflectionText: string) => {
    setEntries(prev => {
      const existingIndex = prev.findIndex(e => e.date === date && e.tags.includes('Reflexión'));
      const textTrimmed = reflectionText.trim();
      
      if (!textTrimmed) {
        // If empty reflection text, remove existing entry if any
        if (existingIndex !== -1) {
          const updated = prev.filter((_, idx) => idx !== existingIndex);
          saveToCache(updated);
          return updated;
        }
        return prev;
      }

      if (existingIndex !== -1) {
        // Update existing reflection entry
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          content: `Reflexión del Día: ${textTrimmed}`,
          timestamp: new Date().toISOString()
        };
        saveToCache(updated);
        return updated;
      } else {
        // Create new reflection entry
        const newEntry: BujoEntry = {
          id: `bujo_refl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          type: 'note',
          content: `Reflexión del Día: ${textTrimmed}`,
          date,
          timestamp: new Date().toISOString(),
          tags: ['Reflexión', 'Personal']
        };
        const updated = [newEntry, ...prev];
        saveToCache(updated);
        return updated;
      }
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
      entries, addEntry, addOrUpdateReflectionEntry, updateEntry, deleteEntry, toggleEntryType,
      toggleFavorite,
      getEntriesForDate, getTodayEntries,
      dailyMoods, getDailyMood, setDailyMood,
      checkIns, getCheckIn, saveCheckIn
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
