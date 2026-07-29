import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { ConfigService } from '../services/ConfigService';
import { useTasks } from './TasksContext';

export const SESSION_TYPES = {
  WORK: 'work',
  SHORT_BREAK: 'short-break',
  LONG_BREAK: 'long-break',
} as const;

export type SessionType = typeof SESSION_TYPES[keyof typeof SESSION_TYPES];

export interface PomodoroSessionRecord {
  id: string;
  type: SessionType;
  project: string;
  task: string;
  durationMinutes: number;
  notes: string;
  device: string;
  timestamp: string;
}

interface PomodoroContextType {
  timeRemaining: number;
  totalDuration: number;
  isActive: boolean;
  isPaused: boolean;
  sessionType: SessionType;
  project: string;
  task: string;
  notes: string;
  activeTaskId: string | null;
  completedSessions: PomodoroSessionRecord[];
  startSession: (type: SessionType, project: string, task: string, durationMinutes?: number, taskId?: string) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  cancelSession: () => void;
  finishSession: () => void;
  updateNotes: (notes: string) => void;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export const PomodoroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [totalDuration, setTotalDuration] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>('work');
  const [project, setProject] = useState('');
  const [task, setTask] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [completedSessions, setCompletedSessions] = useState<PomodoroSessionRecord[]>([]);
  
  const { addTimeSpent } = useTasks();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedSecondsRef = useRef<number>(0);

  // Load initial logs from cache
  useEffect(() => {
    const cachedLogs = localStorage.getItem('quincha_pomodoro_logs');
    if (cachedLogs) {
      try {
        setCompletedSessions(JSON.parse(cachedLogs));
      } catch (e) {
        console.error('Failed to parse cached pomodoro logs', e);
      }
    }
  }, []);

  const saveLogsToCache = (newLogs: PomodoroSessionRecord[]) => {
    localStorage.setItem('quincha_pomodoro_logs', JSON.stringify(newLogs));
    
    // Simulate background API sync
    const config = ConfigService.loadConfig();
    ConfigService.saveConfig(config);
  };

  const flushTimeSpent = useCallback(() => {
    if (activeTaskId && accumulatedSecondsRef.current > 0) {
      addTimeSpent(activeTaskId, accumulatedSecondsRef.current);
      accumulatedSecondsRef.current = 0;
    }
  }, [activeTaskId, addTimeSpent]);

  // Timer Tick implementation
  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          accumulatedSecondsRef.current += 1;
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSessionEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused]);

  const handleSessionEnd = () => {
    flushTimeSpent();
    setIsActive(false);
    setIsPaused(false);
    
    // Add completed session to records
    const durationMin = Math.round(totalDuration / 60);
    const newRecord: PomodoroSessionRecord = {
      id: Math.random().toString(36).substr(2, 9),
      type: sessionType,
      project: project || 'General',
      task: task || 'Sesión de enfoque',
      durationMinutes: durationMin,
      notes: notes,
      device: 'Windows Desktop Client', // Simulated device identifier
      timestamp: new Date().toISOString()
    };

    const updated = [newRecord, ...completedSessions];
    setCompletedSessions(updated);
    saveLogsToCache(updated);

    // If there is an active taskId, dispatch an event to increment completed pomodoros
    if (activeTaskId) {
      window.dispatchEvent(new CustomEvent('pomodoro-completed-for-task', {
        detail: { taskId: activeTaskId }
      }));
    }
  };

  const startSession = useCallback((type: SessionType, projName: string, taskName: string, durationMinutes?: number, taskId?: string) => {
    const defaultDurations = {
      'work': 25 * 60,
      'short-break': 5 * 60,
      'long-break': 15 * 60
    };

    const duration = durationMinutes ? durationMinutes * 60 : defaultDurations[type];
    
    setSessionType(type);
    setProject(projName);
    setTask(taskName);
    setActiveTaskId(taskId || null);
    setNotes('');
    setTotalDuration(duration);
    setTimeRemaining(duration);
    accumulatedSecondsRef.current = 0;
    setIsActive(true);
    setIsPaused(false);
  }, []);

  const pauseSession = useCallback(() => {
    flushTimeSpent();
    setIsPaused(true);
  }, [flushTimeSpent]);

  const resumeSession = useCallback(() => {
    setIsPaused(false);
  }, []);

  const cancelSession = useCallback(() => {
    flushTimeSpent();
    setIsActive(false);
    setIsPaused(false);
    setTimeRemaining(25 * 60);
  }, [flushTimeSpent]);

  const finishSession = useCallback(() => {
    handleSessionEnd();
  }, [sessionType, project, task, notes, totalDuration, completedSessions]);

  const updateNotes = useCallback((newNotes: string) => {
    setNotes(newNotes);
  }, []);

  return (
    <BujoProviderWorkaround>
      <PomodoroContext.Provider value={{
        timeRemaining, totalDuration, isActive, isPaused, sessionType,
        project, task, activeTaskId, notes, completedSessions,
        startSession, pauseSession, resumeSession, cancelSession, finishSession, updateNotes
      }}>
        {children}
      </PomodoroContext.Provider>
    </BujoProviderWorkaround>
  );
};

// Simple helper to avoid import cycles / context issues inside provider
const BujoProviderWorkaround: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const usePomodoro = () => {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
};
