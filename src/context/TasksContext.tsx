import React, { createContext, useContext, useState, useCallback } from 'react';
import { SyncQueueService } from '../services/SyncQueueService';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

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
  completedAt: string | null;
  syncId: string | null;
}

// ─────────────────────────────────────────────
// CONTEXT INTERFACE
// ─────────────────────────────────────────────

interface TasksContextType {
  tasks: Task[];
  projects: Project[];

  // Tasks CRUD
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'syncId' | 'subtasks' | 'completedPomodoros' | 'timeSpentSeconds'>) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  setTaskInProgress: (id: string) => void;

  // Subtasks
  addSubtask: (taskId: string, content: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;

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
// MOCK DATA
// ─────────────────────────────────────────────

function isoNow(): string { return new Date().toISOString(); }
function today(): string { return new Date().toISOString().split('T')[0]; }
function futureDate(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj_quincha',
    name: 'QuinchaDoro',
    color: '#10B981',
    description: 'Desarrollo del sistema operativo personal Quincha Systems',
    client_id: null,
    archived: false,
    createdAt: isoNow()
  },
  {
    id: 'proj_admin',
    name: 'Administración',
    color: '#3B82F6',
    description: 'Gestión interna y operaciones',
    client_id: null,
    archived: false,
    createdAt: isoNow()
  },
  {
    id: 'proj_personal',
    name: 'Personal',
    color: '#8B5CF6',
    description: 'Objetivos y tareas personales',
    client_id: null,
    archived: false,
    createdAt: isoNow()
  }
];

const INITIAL_TASKS: Task[] = [
  {
    id: 'task_1',
    title: 'Integrar módulo de Tareas con Pomodoro',
    description: 'Conectar el selector de tareas en PomodoroModule con el TasksContext real.',
    project_id: 'proj_quincha',
    client_id: null,
    category: 'desarrollo',
    priority: 'urgent',
    status: 'in-progress',
    isBillable: false,
    price: 0,
    dueDate: today(),
    subtasks: [
      { id: 'st_1', content: 'Extender startSession() con taskId', completed: true, createdAt: isoNow() },
      { id: 'st_2', content: 'Crear TaskSelector en PomodoroModule', completed: false, createdAt: isoNow() },
      { id: 'st_3', content: 'Sincronizar completedPomodoros al finalizar', completed: false, createdAt: isoNow() },
    ],
    tags: ['frontend', 'context'],
    estimatedPomodoros: 3,
    completedPomodoros: 1,
    timeSpentSeconds: 1500, // 25 min
    createdAt: isoNow(),
    completedAt: null,
    syncId: null
  },
  {
    id: 'task_2',
    title: 'Diseñar Portal de Clientes',
    description: 'Crear el front-office comercial dual con semáforo de disponibilidad y formulario de solicitudes.',
    project_id: 'proj_quincha',
    client_id: null,
    category: 'diseño',
    priority: 'high',
    status: 'pending',
    dueDate: futureDate(2),
    subtasks: [
      { id: 'st_4', content: 'Hero + AvailabilityBadge', completed: false, createdAt: isoNow() },
      { id: 'st_5', content: 'RequestForm con validación', completed: false, createdAt: isoNow() },
      { id: 'st_6', content: 'Portfolio grid', completed: false, createdAt: isoNow() },
    ],
    tags: ['portal', 'cliente'],
    estimatedPomodoros: 5,
    completedPomodoros: 0,
    timeSpentSeconds: 0,
    createdAt: isoNow(),
    completedAt: null,
    syncId: null
  },
  {
    id: 'task_3',
    title: 'Llamar al contador',
    description: 'Revisar balance trimestral',
    project_id: 'proj_admin',
    client_id: null,
    category: 'comunicación',
    priority: 'medium',
    status: 'pending',
    dueDate: today(),
    subtasks: [],
    tags: ['health', 'qa'],
    estimatedPomodoros: 1,
    completedPomodoros: 0,
    timeSpentSeconds: 0,
    createdAt: isoNow(),
    completedAt: null,
    syncId: null
  },
  {
    id: 'task_4',
    title: 'Actualizar documentación técnica del proyecto',
    description: 'README, contextos exportados, arquitectura de módulos.',
    project_id: 'proj_quincha',
    category: 'documentación',
    priority: 'low',
    status: 'pending',
    dueDate: futureDate(7),
    subtasks: [],
    tags: ['docs'],
    estimatedPomodoros: 2,
    completedPomodoros: 0,
    timeSpentSeconds: 0,
    createdAt: isoNow(),
    completedAt: null,
    syncId: null
  },
  {
    id: 'task_5',
    title: 'Preparar presentación de avance del cliente',
    description: 'Deck de 10 slides con capturas del sistema y hoja de ruta.',
    project_id: 'proj_admin',
    client_id: null,
    category: 'comunicación',
    priority: 'high',
    status: 'pending',
    dueDate: futureDate(3),
    subtasks: [
      { id: 'st_7', content: 'Capturas de pantalla del sistema', completed: false, createdAt: isoNow() },
      { id: 'st_8', content: 'Redactar hoja de ruta Fase 3', completed: false, createdAt: isoNow() },
    ],
    tags: ['cliente', 'presentación'],
    estimatedPomodoros: 3,
    completedPomodoros: 0,
    timeSpentSeconds: 0,
    createdAt: isoNow(),
    completedAt: null,
    syncId: null
  },
  {
    id: 'task_6',
    title: 'Pagar impuestos mensuales',
    description: 'Declaración F29',
    project_id: 'proj_admin',
    client_id: null,
    category: 'finanzas',
    priority: 'medium',
    status: 'pending',
    dueDate: today(),
    subtasks: [],
    tags: ['salud', 'rutina'],
    estimatedPomodoros: 0,
    completedPomodoros: 0,
    timeSpentSeconds: 0,
    createdAt: isoNow(),
    completedAt: null,
    syncId: null
  }
];

// ─────────────────────────────────────────────
// CACHE HELPERS
// ─────────────────────────────────────────────

const TASKS_KEY = 'quincha_tasks';
const PROJECTS_KEY = 'quincha_projects';

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_TASKS;
  } catch { return INITIAL_TASKS; }
}

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_PROJECTS;
  } catch { return INITIAL_PROJECTS; }
}

function saveTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function saveProjects(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

// ─────────────────────────────────────────────
// CONTEXT + PROVIDER
// ─────────────────────────────────────────────

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());

  // ── TASKS ─────────────────────────────────────────

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'syncId' | 'subtasks' | 'completedPomodoros' | 'timeSpentSeconds'>): string => {
    const id = genId('task');
    const newTask: Task = {
      ...task,
      id,
      subtasks: [],
      completedPomodoros: 0,
      timeSpentSeconds: 0,
      createdAt: isoNow(),
      completedAt: null,
      syncId: null
    };
    setTasks(prev => {
      const updated = [newTask, ...prev];
      saveTasks(updated);
      return updated;
    });
    SyncQueueService.enqueue('CREATE_TASK', { ...newTask });
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
  }, []);

  const setTaskInProgress = useCallback((id: string) => {
    updateTask(id, { status: 'in-progress' });
  }, [updateTask]);

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
      addTask, updateTask, deleteTask, completeTask, setTaskInProgress,
      addSubtask, toggleSubtask, deleteSubtask,
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
