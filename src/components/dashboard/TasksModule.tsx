import React, { useState } from 'react';
import { 
  CheckCircle2, Plus, Circle, Search, Filter, ArrowUpDown, 
  MessageSquare, Calendar, MoreHorizontal
} from 'lucide-react';
import { useTasks } from '../../context/TasksContext';
import type { Task, Priority, TaskStatus } from '../../context/TasksContext';
import { TaskDetailSidebar } from './TaskDetailSidebar';
import './Kanban.css';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: '#F0445E',
  high: '#F5B83D',
  medium: '#3B82F6',
  low: '#8994A3',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Desarrollo': '#16C7D9',
  'Diseño': '#F5B83D',
  'Personal': '#D946EF',
  'Investigación': '#9B6CFF',
  'Finanzas': '#22C58B',
  'Hardware': '#3B82F6',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#8994A3';
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  const today = new Date();
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 3600 * 24));
  
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// ─────────────────────────────────────────────
// TASK CARD COMPONENT
// ─────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onClick: (taskId: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onComplete: (taskId: string) => void;
  onDropSubtask: (e: React.DragEvent, targetTaskId: string) => void;
  draggingTaskId: string | null;
  subtaskTargetId: string | null;
  onSubtaskTargetChange: (id: string | null) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task, onClick, onDragStart, onDragEnd, onComplete, onDropSubtask,
  draggingTaskId, subtaskTargetId, onSubtaskTargetChange
}) => {
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  const totalSubtasks = task.subtasks.length;
  const categoryColor = getCategoryColor(task.category);
  const isCompleted = task.status === 'completed';

  return (
    <div 
      className={`kanban-card ${isCompleted ? 'completed' : ''} ${subtaskTargetId === task.id ? 'subtask-drop' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(task.id)}
      onDragEnter={(e) => {
        if (draggingTaskId && draggingTaskId !== task.id) {
          e.preventDefault();
          e.stopPropagation();
          onSubtaskTargetChange(task.id);
        }
      }}
      onDragOver={(e) => {
        if (draggingTaskId && draggingTaskId !== task.id) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          onSubtaskTargetChange(null);
        }
      }}
      onDrop={(e) => {
        onSubtaskTargetChange(null);
        e.preventDefault();
        e.stopPropagation();
        onDropSubtask(e, task.id);
      }}
      style={{
        borderLeft: `3px solid ${PRIORITY_COLORS[task.priority]}`
      }}
    >
      <div className="kanban-card-header">
        <button 
          className="kanban-card-check"
          onClick={(e) => { e.stopPropagation(); onComplete(task.id); }}
        >
          {isCompleted ? <CheckCircle2 size={16} color="#00D89A" /> : <Circle size={16} />}
        </button>
        <h4 className={`kanban-card-title ${isCompleted ? 'completed-title' : ''}`}>
          {task.title}
        </h4>
      </div>

      <div className="kanban-card-badges">
        <span 
          className="kanban-badge"
          style={{ 
            color: categoryColor, 
            backgroundColor: `${categoryColor}15`,
            borderColor: `${categoryColor}30`
          }}
        >
          {task.category || 'General'}
        </span>
      </div>

      <div className="kanban-card-footer">
        <div className="kanban-card-meta">
          {task.dueDate && (
            <span className="kanban-card-meta-item" style={{ color: task.priority === 'urgent' ? '#F0445E' : 'inherit' }}>
              <Calendar size={12} /> {formatShortDate(task.dueDate)}
            </span>
          )}
          {totalSubtasks > 0 && (
            <span className="kanban-card-meta-item">
              <CheckCircle2 size={12} /> {completedSubtasks}/{totalSubtasks}
            </span>
          )}
          {(task.notes || task.observations) && (
            <span className="kanban-card-meta-item">
              <MessageSquare size={12} />
            </span>
          )}
        </div>
        
        {/* Mock Avatar for Assignee - Would come from user system */}
        <div className="kanban-avatar">
          D
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN MODULE
// ─────────────────────────────────────────────

export const TasksModule: React.FC = () => {
  const { tasks, addTask, updateTask, completeTask, setTaskInProgress, makeTaskSubtask } = useTasks();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Quick Add State
  const [quickAddColumn, setQuickAddColumn] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');

  // Drag & Drop State
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [subtaskTargetId, setSubtaskTargetId] = useState<string | null>(null);

  // ── Drag & Drop Handlers ──
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setDraggingTaskId(taskId);
    // Add dragging class for styling on the element itself (optional, browser ghost handles most of it)
    setTimeout(() => {
      (e.target as HTMLElement).classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove('dragging');
    setDraggingTaskId(null);
    setSubtaskTargetId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const taskId = e.dataTransfer.getData('taskId');
    
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
        if (newStatus === 'completed') {
          completeTask(taskId);
        } else if (newStatus === 'in-progress') {
          setTaskInProgress(taskId);
        } else {
          // Si vuelve a pendiente
          updateTask(taskId, { status: 'pending' });
        }
      }
    }
  };

  // Convierte la tarjeta arrastrada en subtarea de la tarjeta destino.
  const handleDropSubtask = (e: React.DragEvent, targetTaskId: string) => {
    const sourceId = e.dataTransfer.getData('taskId') || draggingTaskId;
    if (!sourceId || sourceId === targetTaskId) return;
    const source = tasks.find(t => t.id === sourceId);
    const target = tasks.find(t => t.id === targetTaskId);
    if (!source || !target) return;
    makeTaskSubtask(sourceId, targetTaskId);
  };

  // ── Quick Add Handler ──
  const handleQuickAdd = (e: React.KeyboardEvent<HTMLInputElement>, status: TaskStatus) => {
    if (e.key === 'Enter' && quickAddTitle.trim()) {
      const taskId = addTask({
        title: quickAddTitle.trim(),
        description: '',
        project_id: null,
        client_id: null,
        category: 'Desarrollo', // Default category
        priority: 'medium',
        status: status,
        dueDate: null,
        tags: [],
        estimatedPomodoros: 1,
        isBillable: false,
        price: 0
      });
      
      if (status === 'in-progress') setTaskInProgress(taskId);
      if (status === 'completed') completeTask(taskId);
      
      setQuickAddTitle('');
      setQuickAddColumn(null);
    } else if (e.key === 'Escape') {
      setQuickAddTitle('');
      setQuickAddColumn(null);
    }
  };

  const handleToggleComplete = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      if (task.status === 'completed') {
        updateTask(taskId, { status: 'pending', completedAt: null });
      } else {
        completeTask(taskId);
      }
    }
  };

  // ── Filter Data ──
  const filteredTasks = tasks.filter(t => {
    if (t.status === 'cancelled') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    }
    return true;
  });

  const todoTasks = filteredTasks.filter(t => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in-progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* ── TOP BAR ── */}
      <div className="kanban-top-bar">
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#8994A3" style={{ position: 'absolute', left: 12, top: 10 }} />
          <input 
            type="text" 
            placeholder="Buscar tareas..." 
            className="kanban-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="kanban-top-actions">
          <button className="kanban-action-btn"><Filter size={16} /> Filtro</button>
          <button className="kanban-action-btn"><ArrowUpDown size={16} /> Ordenar</button>
          <button 
            className="kanban-primary-btn"
            onClick={() => setSelectedTaskId('new')} // This could open the sidebar for a new task
          >
            <Plus size={16} /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* ── KANBAN BOARD ── */}
      <div className="kanban-wrapper">
        <div className="kanban-board">
          
          {/* COLUMN 1: POR HACER */}
          <div className="kanban-column">
          <div className="kanban-column-header">
            <div className="kanban-column-title">
              <Circle size={14} fill="currentColor" color="#8994A3" />
              Por hacer
              <span className="kanban-column-count">{todoTasks.length}</span>
            </div>
            <button className="kanban-action-btn" style={{ padding: '4px 8px', border: 'none' }}><MoreHorizontal size={16} /></button>
          </div>
          
          <div className="kanban-quick-add">
            {quickAddColumn === 'pending' ? (
              <input 
                type="text" 
                autoFocus
                className="kanban-quick-add-input"
                placeholder="Escribe y presiona Enter..."
                value={quickAddTitle}
                onChange={e => setQuickAddTitle(e.target.value)}
                onKeyDown={(e) => handleQuickAdd(e, 'pending')}
                onBlur={() => { setQuickAddColumn(null); setQuickAddTitle(''); }}
              />
            ) : (
              <button className="kanban-quick-add-btn" onClick={() => setQuickAddColumn('pending')}>
                <Plus size={14} /> Añadir tarea
              </button>
            )}
          </div>

          <div 
            className="kanban-column-content"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'pending')}
          >
            {todoTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onClick={setSelectedTaskId} 
                onDragStart={handleDragStart} 
                onDragEnd={handleDragEnd}
                onComplete={handleToggleComplete}
                onDropSubtask={handleDropSubtask}
                draggingTaskId={draggingTaskId}
                subtaskTargetId={subtaskTargetId}
                onSubtaskTargetChange={setSubtaskTargetId}
              />
            ))}
          </div>
        </div>

        {/* COLUMN 2: EN PROCESO */}
        <div className="kanban-column" style={{ borderColor: '#1B2632' }}>
          <div className="kanban-column-header">
            <div className="kanban-column-title">
              <Circle size={14} fill="currentColor" color="#3B82F6" />
              En proceso
              <span className="kanban-column-count">{inProgressTasks.length}</span>
            </div>
            <button className="kanban-action-btn" style={{ padding: '4px 8px', border: 'none' }}><MoreHorizontal size={16} /></button>
          </div>

          <div className="kanban-quick-add">
            {quickAddColumn === 'in-progress' ? (
              <input 
                type="text" 
                autoFocus
                className="kanban-quick-add-input"
                placeholder="Escribe y presiona Enter..."
                value={quickAddTitle}
                onChange={e => setQuickAddTitle(e.target.value)}
                onKeyDown={(e) => handleQuickAdd(e, 'in-progress')}
                onBlur={() => { setQuickAddColumn(null); setQuickAddTitle(''); }}
              />
            ) : (
              <button className="kanban-quick-add-btn" onClick={() => setQuickAddColumn('in-progress')}>
                <Plus size={14} /> Añadir tarea
              </button>
            )}
          </div>

          <div 
            className="kanban-column-content"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'in-progress')}
          >
            {inProgressTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onClick={setSelectedTaskId} 
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onComplete={handleToggleComplete}
                onDropSubtask={handleDropSubtask}
                draggingTaskId={draggingTaskId}
                subtaskTargetId={subtaskTargetId}
                onSubtaskTargetChange={setSubtaskTargetId}
              />
            ))}
          </div>
        </div>

        {/* COLUMN 3: TERMINADA */}
        <div className="kanban-column">
          <div className="kanban-column-header">
            <div className="kanban-column-title">
              <CheckCircle2 size={14} color="#00D89A" />
              Terminada
              <span className="kanban-column-count">{completedTasks.length}</span>
            </div>
            <button className="kanban-action-btn" style={{ padding: '4px 8px', border: 'none' }}><MoreHorizontal size={16} /></button>
          </div>

          <div className="kanban-quick-add">
            {quickAddColumn === 'completed' ? (
              <input 
                type="text" 
                autoFocus
                className="kanban-quick-add-input"
                placeholder="Escribe y presiona Enter..."
                value={quickAddTitle}
                onChange={e => setQuickAddTitle(e.target.value)}
                onKeyDown={(e) => handleQuickAdd(e, 'completed')}
                onBlur={() => { setQuickAddColumn(null); setQuickAddTitle(''); }}
              />
            ) : (
              <button className="kanban-quick-add-btn" onClick={() => setQuickAddColumn('completed')}>
                <Plus size={14} /> Añadir tarea
              </button>
            )}
          </div>

          <div 
            className="kanban-column-content"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'completed')}
          >
            {completedTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onClick={setSelectedTaskId} 
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onComplete={handleToggleComplete}
                onDropSubtask={handleDropSubtask}
                draggingTaskId={draggingTaskId}
                subtaskTargetId={subtaskTargetId}
                onSubtaskTargetChange={setSubtaskTargetId}
              />
            ))}
          </div>
        </div>

      </div>
      </div>

      <TaskDetailSidebar 
        taskId={selectedTaskId === 'new' ? null : selectedTaskId} 
        onClose={() => setSelectedTaskId(null)} 
      />
    </div>
  );
};
