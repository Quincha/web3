import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { SyncQueueService } from '../services/SyncQueueService';
import { DataSyncService } from '../services/DataSyncService';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'migrated';

export interface Subtask {
  id: string;
  content: string;
  completed: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  description: string;
  client_id?: string | null;
  archived: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  project_id: string | null;
  client_id?: string | null;
  category: string;
  priority: Priority;
  status: TaskStatus;
  isBillable?: boolean;
  price?: number;
  dueDate: string | null;
  subtasks: Subtask[];
  tags: string[];
  estimatedPomodoros: number;
  completedPomodoros: number;
  timeSpentSeconds: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  syncId: string | null;
  migrationCount?: number;
  notes?: string;
  observations?: string;
}

// ─────────────────────────────────────────────
// CONTEXT INTERFACE
// ─────────────────────────────────────────────

interface TasksContextType {
  tasks: Task[];
  projects: Project[];

  // Tasks CRUD
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'syncId' | 'subtasks' | 'completedPomodoros' | 'timeSpentSeconds' | 'startedAt' | 'notes' | 'observations'>, skipBujoEvent?: boolean) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  setTaskInProgress: (id: string) => void;
  migrateTask: (id: string, baseDate?: string) => string | null; // devuelve la nueva fecha (YYYY-MM-DD) o null

  // Subtasks
  addSubtask: (taskId: string, content: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  makeTaskSubtask: (taskId: string, parentTaskId: string) => void;

  // Projects CRUD
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  archiveProject: (id: string) => void;

  // Pomodoro integration
  incrementTaskPomodoro: (taskId: string) => void;
  addTimeSpent: (taskId: string, seconds: number) => void;

  // Queries
  getTodayTasks: () => Task[];
  getTasksByProject: (projectId: string) => Task[];
  getTasksByPriority: (priority: Priority) => Task[];
  getPendingTasks: () => Task[];
  getActiveProjects: () => Project[];
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function isoNow(): string { return new Date().toISOString(); }
function today(): string { return new Date().toISOString().split('T')[0]; }
function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

// Siguiente día hábil (lunes a viernes) desde una fecha ISO base, saltando findes.
function nextBusinessDay(fromISO: string | null): string {
  const base = fromISO ? new Date(fromISO + 'T12:00:00') : new Date();
  const d = new Date(base);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ─────────────────────────────────────────────
// CACHE HELPERS
// ─────────────────────────────────────────────

const TASKS_KEY = 'quincha_tasks_v2';
const PROJECTS_KEY = 'quincha_projects_v2';

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  DataSyncService.markDirty('tasks');
}

function saveProjects(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  DataSyncService.markDirty('tasks');
}

// ─────────────────────────────────────────────
// CONTEXT + PROVIDER
// ─────────────────────────────────────────────

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());

  // Restaura datos bajados del servidor (pull) al cambiar de equipo.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { data?: { tasks?: Task[]; projects?: Project[] } } | undefined;
      const data = detail?.data;
      if (!data) return;
      if (Array.isArray(data.tasks)) { setTasks(data.tasks); saveTasks(data.tasks); }
      if (Array.isArray(data.projects)) { setProjects(data.projects); saveProjects(data.projects); }
    };
    window.addEventListener('quincha-restore:tasks', handler);
    return () => window.removeEventListener('quincha-restore:tasks', handler);
  }, []);

  // ── TASKS ─────────────────────────────────────────

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'syncId' | 'subtasks' | 'completedPomodoros' | 'timeSpentSeconds' | 'startedAt' | 'notes' | 'observations'>, skipBujoEvent?: boolean): string => {
    const id = genId('task');
    let cTitle = task.title.trim();
    if (cTitle.length > 0) {
      cTitle = cTitle.charAt(0).toUpperCase() + cTitle.slice(1);
    }
    
    const newTask: Task = {
      ...task,
      title: cTitle,
      id,
      subtasks: [],
      completedPomodoros: 0,
      timeSpentSeconds: 0,
      createdAt: isoNow(),
      startedAt: null,
      completedAt: null,
      syncId: null,
      notes: '',
      observations: ''
    };
    setTasks(prev => {
      const updated = [newTask, ...prev];
      saveTasks(updated);
      return updated;
    });
    SyncQueueService.enqueue('CREATE_TASK', { ...newTask });
    
    if (!skipBujoEvent) {
      window.dispatchEvent(new CustomEvent('task-added', { detail: newTask }));
    }
    
    return id;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      saveTasks(updated);
      return updated;
    });
    SyncQueueService.enqueue('UPDATE_TASK', { id, ...updates });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const updated = prev.filter(t => t.id !== id);
      saveTasks(updated);
      return updated;
    });
    SyncQueueService.enqueue('DELETE_TASK', { id });
    window.dispatchEvent(new CustomEvent('task-deleted', { detail: { id } }));
  }, []);

  const completeTask = useCallback((id: string) => {
    const completedAt = isoNow();
    setTasks(prev => {
      const updated = prev.map(t =>
        t.id === id ? { ...t, status: 'completed' as TaskStatus, completedAt } : t
      );
      saveTasks(updated);
      return updated;
    });
    SyncQueueService.enqueue('COMPLETE_TASK', { id, completedAt });
    window.dispatchEvent(new CustomEvent('task-completed', { detail: { id, completedAt } }));
  }, []);

  const setTaskInProgress = useCallback((id: string) => {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === id) {
          const startedAt = t.startedAt ? t.startedAt : isoNow();
          return { ...t, status: 'in-progress' as TaskStatus, startedAt };
        }
        return t;
      });
      saveTasks(updated);
      return updated;
    });
    SyncQueueService.enqueue('UPDATE_TASK', { id, status: 'in-progress' });
  }, []);

  const migrateTask = useCallback((id: string, baseDate?: string): string | null => {
    const nowISO = today();
    const target = tasks.find(t => t.id === id);
    const newDate = baseDate || (target ? target.dueDate || nowISO : nowISO);
    const next = nextBusinessDay(newDate);
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id !== id) return t;
        return {
          ...t,
          status: 'migrated' as TaskStatus,
          dueDate: next,
          migrationCount: (t.migrationCount || 0) + 1,
        };
      });
      saveTasks(updated);
      SyncQueueService.enqueue('UPDATE_TASK', { id, status: 'migrated', dueDate: next, migrationCount: (target?.migrationCount || 0) + 1 });
      return updated;
    });
    return next;
  }, [tasks]);

  // ── SUBTASKS ──────────────────────────────────────

  const addSubtask = useCallback((taskId: string, content: string) => {
    const newSubtask: Subtask = {
      id: genId('st'),
      content,
      completed: false,
      createdAt: isoNow()
    };
    setTasks(prev => {
      const updated = prev.map(t =>
        t.id === taskId
          ? { ...t, subtasks: [...t.subtasks, newSubtask] }
          : t
      );
      saveTasks(updated);
      return updated;
    });
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev => {
      const updated = prev.map(t =>
        t.id !== taskId ? t : {
          ...t,
          subtasks: t.subtasks.map(s =>
            s.id === subtaskId ? { ...s, completed: !s.completed } : s
          )
        }
      );
      saveTasks(updated);
      return updated;
    });
  }, []);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev => {
      const updated = prev.map(t =>
        t.id !== taskId ? t : {
          ...t,
          subtasks: t.subtasks.filter(s => s.id !== subtaskId)
        }
      );
      saveTasks(updated);
      return updated;
    });
  }, []);

  // Convierte una tarea en subtarea de otra (drag & drop dentro de una tarjeta).
  const makeTaskSubtask = useCallback((taskId: string, parentTaskId: string) => {
    if (taskId === parentTaskId) return;
    setTasks(prev => {
      const source = prev.find(t => t.id === taskId);
      const parent = prev.find(t => t.id === parentTaskId);
      if (!source || !parent) return prev;
      const subtask: Subtask = {
        id: source.id,
        content: source.title,
        completed: false,
        createdAt: isoNow(),
      };
      const updated = prev
        .filter(t => t.id !== taskId)
        .map(t => t.id === parentTaskId ? { ...t, subtasks: [...t.subtasks, subtask] } : t);
      saveTasks(updated);
      return updated;
    });
    // El bujo también debe quitar la entrada de la tarea absorbida.
    window.dispatchEvent(new CustomEvent('task-deleted', { detail: { id: taskId } }));
  }, []);

  // ── PROJECTS ──────────────────────────────────────

  const addProject = useCallback((project: Omit<Project, 'id' | 'createdAt'>): string => {
    const id = genId('proj');
    const newProject: Project = { ...project, id, createdAt: isoNow() };
    setProjects(prev => {
      const updated = [...prev, newProject];
      saveProjects(updated);
      return updated;
    });
    SyncQueueService.enqueue('CREATE_PROJECT', { ...newProject });
    return id;
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      saveProjects(updated);
      return updated;
    });
    SyncQueueService.enqueue('UPDATE_PROJECT', { id, ...updates });
  }, []);

  const archiveProject = useCallback((id: string) => {
    updateProject(id, { archived: true });
  }, [updateProject]);

  // ── POMODORO INTEGRATION ──────────────────────────

  const addTimeSpent = useCallback((taskId: string, seconds: number) => {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskId) {
          return { ...t, timeSpentSeconds: (t.timeSpentSeconds || 0) + seconds };
        }
        return t;
      });
      saveTasks(updated);
      return updated;
    });
  }, []);

  const incrementTaskPomodoro = useCallback((taskId: string) => {
    setTasks(prev => {
      const updated = prev.map(t =>
        t.id === taskId
          ? { ...t, completedPomodoros: t.completedPomodoros + 1 }
          : t
      );
      saveTasks(updated);
      return updated;
    });
  }, []);

  // ── QUERIES ───────────────────────────────────────

  const getTodayTasks = useCallback((): Task[] => {
    const t = today();
    return tasks
      .filter(task =>
        task.status !== 'completed' &&
        task.status !== 'cancelled' &&
        (task.dueDate === null || task.dueDate <= t)
      )
      .sort((a, b) => {
        const pOrder: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
        return pOrder[a.priority] - pOrder[b.priority];
      });
  }, [tasks]);

  const getTasksByProject = useCallback((projectId: string): Task[] => {
    return tasks.filter(t => t.project_id === projectId && t.status !== 'cancelled');
  }, [tasks]);

  const getTasksByPriority = useCallback((priority: Priority): Task[] => {
    return tasks.filter(t => t.priority === priority && t.status !== 'completed' && t.status !== 'cancelled');
  }, [tasks]);

  const getPendingTasks = useCallback((): Task[] => {
    return tasks.filter(t => t.status === 'pending' || t.status === 'in-progress');
  }, [tasks]);

  const getActiveProjects = useCallback((): Project[] => {
    return projects.filter(p => !p.archived);
  }, [projects]);

  return (
    <TasksContext.Provider value={{
      tasks, projects,
      addTask, updateTask, deleteTask, completeTask, setTaskInProgress, migrateTask,
      addSubtask, toggleSubtask, deleteSubtask, makeTaskSubtask,
      addProject, updateProject, archiveProject,
      incrementTaskPomodoro, addTimeSpent,
      getTodayTasks, getTasksByProject, getTasksByPriority, getPendingTasks, getActiveProjects
    }}>
      {children}
    </TasksContext.Provider>
  );
};

export const useTasks = () => {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within a TasksProvider');
  return ctx;
};
