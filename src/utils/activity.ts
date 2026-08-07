import type { Task, Project } from '../context/TasksContext';

export type ActivityType = 'complete' | 'task-create' | 'project-create';

export interface ActivityItem {
  id: string;
  text: string;
  timestamp: number;
  color: string;
  type: ActivityType;
}

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  complete: '#16F0B5',
  'task-create': '#3ACDFF',
  'project-create': '#B388FF',
};

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (diff < 0 || mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  return new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function buildActivity(tasks: Task[], projects: Project[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  tasks.forEach(t => {
    items.push({
      id: `${t.id}-create`,
      type: 'task-create',
      text: `Creaste la tarea "${t.title}"`,
      timestamp: Date.parse(t.createdAt) || 0,
      color: ACTIVITY_COLORS['task-create'],
    });

    if (t.status === 'completed' && t.completedAt) {
      items.push({
        id: `${t.id}-complete`,
        type: 'complete',
        text: `Completaste la tarea "${t.title}"`,
        timestamp: Date.parse(t.completedAt) || 0,
        color: ACTIVITY_COLORS.complete,
      });
    }
  });

  projects.forEach(p => {
    items.push({
      id: `${p.id}-create`,
      type: 'project-create',
      text: `Creaste el proyecto "${p.name}"`,
      timestamp: Date.parse(p.createdAt) || 0,
      color: ACTIVITY_COLORS['project-create'],
    });
  });

  return items
    .filter(a => a.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp);
}