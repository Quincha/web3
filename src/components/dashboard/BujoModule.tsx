import React, { useState, useRef, useEffect } from 'react';
import { useBujo } from '../../context/BujoContext';
import type { BujoEntryType, BujoEntry } from '../../context/BujoContext';
import { usePomodoro } from '../../context/PomodoroContext';
import { useTasks } from '../../context/TasksContext';
import { DailyCheckInBlock } from './DailyCheckInBlock';
import { TasksModule } from './TasksModule';
import { HabitsModule } from './HabitsModule';
import { HealthModule } from './HealthModule';
import { BandModule } from './BandModule';
import { ProjectsModule } from './ProjectsModule';
import { CalendarModule } from './CalendarModule';
import { ShoppingModule } from './ShoppingModule';
import { GoalsModule } from './GoalsModule';
import { 
  Trash2, Circle, X, ArrowRight, ArrowLeft, Minus, Tag, Plus,
  Star, MoreHorizontal, ChevronLeft, ChevronRight, Clock, User, 
  CheckCircle, Flame, Brain, Activity, AlertCircle
} from 'lucide-react';

const BUJO_SYMBOLS: Record<BujoEntryType, { icon: React.ReactNode; label: string; color: string }> = {
  task:      { icon: <Circle size={10} fill="currentColor" />, label: 'Tarea',    color: '#00E676' },
  completed: { icon: <CheckCircle size={12} strokeWidth={2.5} />, label: 'Completada', color: '#00E676' },
  migrated:  { icon: <ArrowRight size={14} strokeWidth={2.5}/>, label: 'Migrada',  color: '#00E676' },
  scheduled: { icon: <ArrowLeft size={14} strokeWidth={2.5} />, label: 'Programada', color: '#29B6F6' },
  cancelled: { icon: <X size={12} strokeWidth={3} />,         label: 'Descartada', color: 'rgba(255,255,255,0.3)' },
  note:      { icon: <Minus size={14} strokeWidth={3} />,       label: 'Nota',     color: '#AB47BC' },
  event:     { icon: <Circle size={10} />,                      label: 'Evento',   color: '#FFA726' },
};

const DEFAULT_TAGS = ['Trabajo', 'Clientes', 'Personal', 'Sistema', 'Estudio'];

export const BujoModule: React.FC = () => {
  const { entries, addEntry, deleteEntry, toggleEntryType, toggleFavorite, updateEntry } = useBujo();
  const { completedSessions } = usePomodoro();
  const { addTask, completeTask } = useTasks();

  const [inputValue, setInputValue] = useState('');
  const [selectedType, setSelectedType] = useState<BujoEntryType>('task');
  // @ts-expect-error unused
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeTab, setActiveTab] = useState<'diario' | 'calendario' | 'tareas' | 'habitos' | 'bienestar' | 'proyectos' | 'compras' | 'metas'>('diario');
  
  // Date and Calendar states
  const todayISO = new Date().toISOString().split('T')[0];
  const [selectedDateStr, setSelectedDateStr] = useState(todayISO);
  const [currentYear, setCurrentYear] = useState(new Date(selectedDateStr).getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDateStr).getMonth()); // 0-11

  // Active filters
  const [activeFiltro, setActiveFiltro] = useState<'hoy' | 'semana' | 'pendientes' | 'completadas' | 'notas' | 'eventos'>('hoy');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  // UI states
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [newTagInputOpen, setNewTagInputOpen] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [customTags, setCustomTags] = useState<string[]>(DEFAULT_TAGS);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleOutsideClick = () => setMenuOpenId(null);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Retroactive Sync for today's unsynced tasks
  const [hasMigrated, setHasMigrated] = useState(false);
  useEffect(() => {
    if (hasMigrated) return;
    const unsynced = entries.filter(e => 
      (e.type === 'task' || e.type === 'completed') && 
      !e.linkedTaskId &&
      e.date === todayISO
    );
    if (unsynced.length > 0) {
      unsynced.forEach(entry => {
        const linkedTaskId = addTask({
          title: entry.content,
          description: '',
          project_id: null,
          client_id: null,
          category: 'general',
          priority: 'medium',
          status: entry.type === 'completed' ? 'completed' : 'pending',
          dueDate: null,
          tags: [],
          estimatedPomodoros: 1,
          isBillable: false,
          price: 0
        });
        updateEntry(entry.id, { linkedTaskId });
      });
    }
    setHasMigrated(true);
  }, [entries, addTask, updateEntry, hasMigrated, todayISO]);

  // Filter logic
  const getFilteredEntries = (): BujoEntry[] => {
    let result = [...entries];

    // 1. Text Search
    if (searchQuery.trim()) {
      result = result.filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // 2. Sidebar Tag filter
    if (selectedTag) {
      result = result.filter(e => e.tags.includes(selectedTag));
    }

    // 3. Quick Filters
    if (activeFiltro === 'hoy') {
      result = result.filter(e => e.date === selectedDateStr);
    } else if (activeFiltro === 'semana') {
      const selectedDate = new Date(selectedDateStr);
      const startOfWeek = new Date(selectedDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0,0,0,0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);

      result = result.filter(e => {
        const entryDate = new Date(e.date + 'T12:00:00');
        return entryDate >= startOfWeek && entryDate <= endOfWeek;
      });
    } else if (activeFiltro === 'pendientes') {
      result = result.filter(e => e.type === 'task');
    } else if (activeFiltro === 'completadas') {
      result = result.filter(e => e.type === 'completed');
    } else if (activeFiltro === 'notas') {
      result = result.filter(e => e.type === 'note');
    } else if (activeFiltro === 'eventos') {
      result = result.filter(e => e.type === 'event');
    }

    // Sort by timestamp
    return result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const displayEntries = getFilteredEntries();

  // Helper date formatter
  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formatted = d.toLocaleDateString('es-ES', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  // Quick action: Submit entry
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    let content = inputValue.trim();
    if (content.length > 0) {
      content = content.charAt(0).toUpperCase() + content.slice(1);
    }
    
    let linkedTaskId: string | undefined = undefined;
    if (selectedType === 'task') {
      linkedTaskId = addTask({
        title: content,
        description: '',
        project_id: null,
        client_id: null,
        category: 'general',
        priority: 'medium',
        status: 'pending',
        dueDate: null,
        tags: [],
        estimatedPomodoros: 1,
        isBillable: false,
        price: 0
      }, true);
    }

    addEntry(content, selectedType, [], undefined, undefined, selectedDateStr, linkedTaskId);
    setInputValue('');
    if (inputRef.current) inputRef.current.focus();
  };

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Adjust: Monday is 0, Sunday is 6
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const renderCalendarCells = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const cells: React.ReactNode[] = [];

    // Empty cells before start day
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="bujo-calendar-cell empty"></div>);
    }

    // Days in month
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
      const isActive = dateStr === selectedDateStr;
      
      // Check if day has entries
      const hasEntries = entries.some(e => e.date === dateStr);

      cells.push(
        <div
          key={`day-${day}`}
          className={`bujo-calendar-cell ${isActive ? 'active' : ''}`}
          onClick={() => {
            setSelectedDateStr(dateStr);
            setActiveFiltro('hoy'); // Filter to selected day when clicked
          }}
        >
          {day}
          {hasEntries && <span className="bujo-calendar-dot" />}
        </div>
      );
    }

    return cells;
  };

  // Add custom tag
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagValue.trim() && !customTags.includes(newTagValue.trim())) {
      setCustomTags([...customTags, newTagValue.trim()]);
      setNewTagValue('');
      setNewTagInputOpen(false);
    }
  };

  // Productivity Metrics Calculations
  const todayEntries = entries.filter(e => e.date === todayISO);
  const todayTasks = todayEntries.filter(e => ['task', 'completed'].includes(e.type));
  const todayCompletedTasks = todayEntries.filter(e => e.type === 'completed');
  const productivityPct = todayTasks.length > 0 
    ? Math.round((todayCompletedTasks.length / todayTasks.length) * 100) 
    : 0;

  const todayNotesCount = todayEntries.filter(e => e.type === 'note').length;
  const todayEventsCount = todayEntries.filter(e => e.type === 'event').length;

  // Real Pomodoros stats
  const todayPomodoros = completedSessions.filter(s => s.timestamp.startsWith(todayISO));
  const pomodoroCount = todayPomodoros.length;
  const totalFocusTime = todayPomodoros.reduce((acc, s) => acc + s.durationMinutes, 0);
  const focusTimeHours = Math.floor(totalFocusTime / 60);
  const focusTimeMinutes = totalFocusTime % 60;
  const focusTimeStr = focusTimeHours > 0 ? `${focusTimeHours}h ${focusTimeMinutes}m` : `${focusTimeMinutes}m`;

  // Color mappings for specific tags
  const getTagColor = (tag: string) => {
    switch (tag.toLowerCase()) {
      case 'trabajo': return '#00E676';
      case 'clientes': return '#29B6F6';
      case 'personal': return '#AB47BC';
      case 'sistema': return '#FFA726';
      case 'estudio': return '#26A69A';
      default: return '#78909C';
    }
  };

  return (
    <div className="bujo-module-container">
      {/* 1. HEADER ROW */}
      <div className="bujo-header-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px', paddingBottom: '0' }}>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="bujo-header-left">
            <h2>Bullet Journal</h2>
            <p>{formatDateLabel(selectedDateStr)}</p>
          </div>
          {activeTab === 'diario' && (
            <div className="bujo-header-stats">
              <div className="bujo-stat-badge" style={{ color: '#00E676' }}>
                <span className="count">{todayTasks.length}</span>
                <span>tareas</span>
              </div>
              <div className="bujo-stat-badge" style={{ color: '#AB47BC' }}>
                <span className="count">{todayNotesCount}</span>
                <span>notas</span>
              </div>
              <div className="bujo-stat-badge" style={{ color: '#FFA726' }}>
                <span className="count">{todayEventsCount}</span>
                <span>evento{todayEventsCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Sub-navigation Tabs */}
        <div style={{ display: 'flex', gap: '16px', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.1)', overflowX: 'auto', paddingBottom: '4px' }}>
          {['diario', 'calendario', 'tareas', 'habitos', 'bienestar', 'proyectos', 'compras', 'metas'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{ 
                background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', 
                padding: '8px 4px', position: 'relative', textTransform: 'capitalize',
                color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.5)',
                fontWeight: activeTab === tab ? 600 : 400,
                whiteSpace: 'nowrap'
              }}
            >
              {tab}
              {activeTab === tab && <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: 'var(--accent-primary)', borderRadius: 2 }} />}
            </button>
          ))}
        </div>
      </div>
      
      {activeTab === 'diario' && (
        <>
{/* Alert if no bullet entry today */}
{(() => {
  const hasToday = entries.some(e => e.date === todayISO);
  if (hasToday) return null;
  return (
    <div className="bujo-alert" style={{
      display: 'flex',
      alignItems: 'center',
      background: 'rgba(245, 158, 11, 0.1)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      borderRadius: '8px',
      padding: '8px 12px',
      marginBottom: '16px',
      color: '#FBBF24'
    }}>
      <AlertCircle size={20} style={{ marginRight: '8px' }} />
      <span>No has anotado tu bullet de hoy.</span>
    </div>
  );
})()}

      {/* Daily Check-in & Habit Synchronization Block */}
      <DailyCheckInBlock selectedDateStr={selectedDateStr} />

      {/* 2. MAIN GRID LAYOUT */}
      <div className="bujo-grid-layout">
        
        {/* COLUMNA IZQUIERDA: INPUT Y TIMELINE */}
        <div className="bujo-left-col">
          
          {/* Quick Input Premium */}
          <div className="bujo-quick-input-premium">
            <form onSubmit={handleSubmit} className="bujo-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Escribe una entrada rápida... (ej. #Trabajo @Felipe (45 min) Preparar avance)"
                autoFocus
              />
              <span className="bujo-input-enter-btn">Enter para guardar</span>
            </form>

            <div className="bujo-inline-pills">
              {(['task', 'note', 'event'] as BujoEntryType[]).map(type => {
                const sym = BUJO_SYMBOLS[type];
                const isActive = selectedType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    className={`bujo-inline-pill ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedType(type)}
                    style={{ '--pill-color': sym.color } as React.CSSProperties}
                  >
                    <span>{sym.icon}</span>
                    <span>{sym.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeline Card */}
          <div className="bujo-timeline-card">
            {displayEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                No hay entradas registradas para este filtro o fecha.
              </div>
            ) : (
              <div className="bujo-timeline-list">
                <div className="bujo-timeline-line" />
                {displayEntries.map((entry) => {
                  const sym = BUJO_SYMBOLS[entry.type] || BUJO_SYMBOLS.task;
                  const timeStr = entry.timestamp 
                    ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                    : '00:00';
                  
                  return (
                    <div key={entry.id} className="bujo-timeline-item">
                      {/* 1. Time */}
                      <div className="bujo-time-col">{timeStr}</div>

                      {/* 2. Node Circle */}
                      <div className="bujo-node-col">
                        <div 
                          className="bujo-node-circle"
                          style={{ color: sym.color }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === entry.id ? null : entry.id);
                          }}
                          title="Cambiar estado"
                        >
                          {sym.icon}
                        </div>

                        {/* Menu contextual */}
                        {menuOpenId === entry.id && (
                          <div className="bujo-context-menu" onClick={e => e.stopPropagation()}>
                            {(Object.keys(BUJO_SYMBOLS) as BujoEntryType[]).map(type => (
                              <button
                                key={type}
                                className="bujo-menu-item"
                                onClick={() => {
                                  toggleEntryType(entry.id, type);
                                  setMenuOpenId(null);
                                  if (type === 'completed' && entry.linkedTaskId) {
                                    completeTask(entry.linkedTaskId);
                                  }
                                }}
                              >
                                <span style={{ color: BUJO_SYMBOLS[type].color, display: 'flex', alignItems: 'center' }}>
                                  {BUJO_SYMBOLS[type].icon}
                                </span>
                                <span>{BUJO_SYMBOLS[type].label}</span>
                              </button>
                            ))}
                            <hr style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />
                            <button
                              className="bujo-menu-item"
                              style={{ color: '#EF4444' }}
                              onClick={() => {
                                deleteEntry(entry.id);
                                setMenuOpenId(null);
                              }}
                            >
                              <Trash2 size={12} />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 3. Content */}
                      <div className={`bujo-content-col ${entry.type === 'completed' || entry.type === 'cancelled' ? 'bujo-item-completed' : ''}`}>
                        <div className="bujo-content-header">
                          <span className="bujo-item-title">{entry.content}</span>
                          <div className="bujo-item-actions">
                            <button 
                              className={`bujo-action-btn bujo-star-btn ${entry.isFavorite ? 'active' : ''}`}
                              onClick={() => toggleFavorite(entry.id)}
                            >
                              <Star size={14} fill={entry.isFavorite ? 'currentColor' : 'none'} />
                            </button>
                            <button 
                              className="bujo-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(menuOpenId === entry.id ? null : entry.id);
                              }}
                            >
                              <MoreHorizontal size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Badges y Tags */}
                        <div className="bujo-meta-row">
                          {/* Badge de Tipo */}
                          <span className="bujo-badge-type" style={{
                            backgroundColor: `${sym.color}15`,
                            color: sym.color,
                            border: `1px solid ${sym.color}25`
                          }}>
                            {sym.label}
                          </span>

                          {/* Badge Duracion */}
                          {entry.duration && (
                            <span className="bujo-meta-badge">
                              <Clock size={10} />
                              <span>{entry.duration}</span>
                            </span>
                          )}

                          {/* Badge Asignado */}
                          {entry.assignee && (
                            <span className="bujo-meta-badge">
                              <User size={10} />
                              <span>{entry.assignee}</span>
                            </span>
                          )}

                          {/* Tags de entrada */}
                          {entry.tags?.map(t => {
                            const tagCol = getTagColor(t);
                            return (
                              <span key={t} className="bujo-meta-badge" style={{ color: tagCol, borderColor: `${tagCol}20` }}>
                                <Tag size={10} />
                                <span>{t}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: SIDEBAR */}
        <div className="bujo-right-col">
          
          {/* Calendario Widget */}
          <div className="bujo-sidebar-widget">
            <div className="bujo-calendar-header">
              <span>{monthNames[currentMonth]} {currentYear}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="bujo-action-btn" onClick={handlePrevMonth}><ChevronLeft size={16} /></button>
                <button className="bujo-action-btn" onClick={handleNextMonth}><ChevronRight size={16} /></button>
              </div>
            </div>
            <div className="bujo-calendar-grid">
              <span className="bujo-calendar-day-header">L</span>
              <span className="bujo-calendar-day-header">M</span>
              <span className="bujo-calendar-day-header">M</span>
              <span className="bujo-calendar-day-header">J</span>
              <span className="bujo-calendar-day-header">V</span>
              <span className="bujo-calendar-day-header">S</span>
              <span className="bujo-calendar-day-header">D</span>
              {renderCalendarCells()}
            </div>
          </div>

          {/* Resumen del Día */}
          <div className="bujo-sidebar-widget">
            <h3>Resumen del día</h3>
            <div className="bujo-resumen-list">
              <div className="bujo-resumen-row">
                <div className="bujo-resumen-left">
                  <span style={{ color: '#00E676', display: 'flex', alignItems: 'center' }}><CheckCircle size={14} /></span>
                  <div>
                    <span>{todayTasks.length} tareas</span>
                    <br />
                    <small>{todayCompletedTasks.length} completadas</small>
                  </div>
                </div>
                <div className="bujo-resumen-right" style={{ color: '#00E676' }}>
                  {productivityPct}%
                </div>
              </div>
              <div className="bujo-resumen-row">
                <div className="bujo-resumen-left">
                  <span style={{ color: '#AB47BC', display: 'flex', alignItems: 'center' }}><Minus size={14} strokeWidth={3} /></span>
                  <span>{todayNotesCount} notas</span>
                </div>
                <div className="bujo-resumen-right">-</div>
              </div>
              <div className="bujo-resumen-row">
                <div className="bujo-resumen-left">
                  <span style={{ color: '#FFA726', display: 'flex', alignItems: 'center' }}><Circle size={12} /></span>
                  <span>{todayEventsCount} evento{todayEventsCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="bujo-resumen-right">-</div>
              </div>
            </div>
          </div>

          {/* Etiquetas */}
          <div className="bujo-sidebar-widget">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Etiquetas</h3>
              <button 
                className="bujo-action-btn"
                onClick={() => setNewTagInputOpen(!newTagInputOpen)}
              >
                <Plus size={16} />
              </button>
            </div>

            {newTagInputOpen && (
              <form onSubmit={handleAddTag} style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Nueva etiqueta..."
                  value={newTagValue}
                  onChange={e => setNewTagValue(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    color: '#fff',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                />
                <button type="submit" className="bujo-action-btn"><Plus size={14} /></button>
              </form>
            )}

            <div className="bujo-tags-container">
              <button
                className={`bujo-tag-pill ${!selectedTag ? 'active' : ''}`}
                onClick={() => setSelectedTag(null)}
              >
                <span>Todas</span>
              </button>
              {customTags.map(tag => {
                const col = getTagColor(tag);
                const isActive = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    className={`bujo-tag-pill ${isActive ? 'active' : ''}`}
                    style={{ color: col } as React.CSSProperties}
                    onClick={() => setSelectedTag(isActive ? null : tag)}
                  >
                    <span className="bujo-tag-dot" />
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtros Rápidos */}
          <div className="bujo-sidebar-widget">
            <h3>Filtros rápidos</h3>
            <div className="bujo-filtros-list">
              <button 
                className={`bujo-filtro-item ${activeFiltro === 'hoy' ? 'active' : ''}`}
                onClick={() => { setActiveFiltro('hoy'); setSelectedTag(null); }}
              >
                <span>Hoy</span>
                <span className="bujo-filtro-count">{entries.filter(e => e.date === todayISO).length}</span>
              </button>
              <button 
                className={`bujo-filtro-item ${activeFiltro === 'semana' ? 'active' : ''}`}
                onClick={() => { setActiveFiltro('semana'); setSelectedTag(null); }}
              >
                <span>Esta semana</span>
                <span className="bujo-filtro-count">
                  {
                    entries.filter(e => {
                      const selectedDate = new Date(selectedDateStr);
                      const startOfWeek = new Date(selectedDate);
                      const day = startOfWeek.getDay();
                      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
                      startOfWeek.setDate(diff);
                      startOfWeek.setHours(0,0,0,0);
                      const endOfWeek = new Date(startOfWeek);
                      endOfWeek.setDate(startOfWeek.getDate() + 6);
                      endOfWeek.setHours(23,59,59,999);
                      const entryDate = new Date(e.date + 'T12:00:00');
                      return entryDate >= startOfWeek && entryDate <= endOfWeek;
                    }).length
                  }
                </span>
              </button>
              <button 
                className={`bujo-filtro-item ${activeFiltro === 'pendientes' ? 'active' : ''}`}
                onClick={() => { setActiveFiltro('pendientes'); setSelectedTag(null); }}
              >
                <span>Pendientes</span>
                <span className="bujo-filtro-count">{entries.filter(e => e.type === 'task').length}</span>
              </button>
              <button 
                className={`bujo-filtro-item ${activeFiltro === 'completadas' ? 'active' : ''}`}
                onClick={() => { setActiveFiltro('completadas'); setSelectedTag(null); }}
              >
                <span>Completadas</span>
                <span className="bujo-filtro-count">{entries.filter(e => e.type === 'completed').length}</span>
              </button>
              <button 
                className={`bujo-filtro-item ${activeFiltro === 'notas' ? 'active' : ''}`}
                onClick={() => { setActiveFiltro('notas'); setSelectedTag(null); }}
              >
                <span>Notas</span>
                <span className="bujo-filtro-count">{entries.filter(e => e.type === 'note').length}</span>
              </button>
              <button 
                className={`bujo-filtro-item ${activeFiltro === 'eventos' ? 'active' : ''}`}
                onClick={() => { setActiveFiltro('eventos'); setSelectedTag(null); }}
              >
                <span>Eventos</span>
                <span className="bujo-filtro-count">{entries.filter(e => e.type === 'event').length}</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* 3. FOOTER PRODUCTIVIDAD WIDGETS */}
      <div className="bujo-footer-widgets">
        <div className="bujo-stat-card">
          <div className="bujo-stat-card-left">
            <span className="bujo-stat-card-label">Productividad</span>
            <div className="bujo-stat-card-val-row">
              <span className="bujo-stat-card-value">{productivityPct}%</span>
            </div>
            <span className="bujo-stat-card-sub">Hoy</span>
          </div>
          <div className="bujo-stat-card-right" style={{ color: '#00E676' }}>
            <Activity size={20} />
          </div>
        </div>

        <div className="bujo-stat-card">
          <div className="bujo-stat-card-left">
            <span className="bujo-stat-card-label">Pomodoros</span>
            <div className="bujo-stat-card-val-row">
              <span className="bujo-stat-card-value">{pomodoroCount}</span>
              <span className="bujo-stat-card-sub">completados</span>
            </div>
            <span className="bujo-stat-card-sub">Sesiones de hoy</span>
          </div>
          <div className="bujo-stat-card-right" style={{ color: '#FF5252' }}>
            <Brain size={20} />
          </div>
        </div>

        <div className="bujo-stat-card">
          <div className="bujo-stat-card-left">
            <span className="bujo-stat-card-label">Tiempo enfocado</span>
            <div className="bujo-stat-card-val-row">
              <span className="bujo-stat-card-value">{focusTimeStr}</span>
            </div>
            <span className="bujo-stat-card-sub">Sesiones productivas</span>
          </div>
          <div className="bujo-stat-card-right" style={{ color: '#29B6F6' }}>
            <Clock size={20} />
          </div>
        </div>

        <div className="bujo-stat-card">
          <div className="bujo-stat-card-left">
            <span className="bujo-stat-card-label">Racha actual</span>
            <div className="bujo-stat-card-val-row">
              <span className="bujo-stat-card-value">7</span>
              <span className="bujo-stat-card-sub">días</span>
            </div>
            <span className="bujo-stat-card-sub">¡Excelente ritmo!</span>
          </div>
          <div className="bujo-stat-card-right" style={{ color: '#FFA726' }}>
            <Flame size={20} />
          </div>
        </div>
      </div>
        </>
      )}

      {activeTab === 'calendario' && (
        <div style={{ marginTop: '24px' }}>
          <CalendarModule />
        </div>
      )}

      {activeTab === 'tareas' && (
        <div style={{ marginTop: '24px' }}>
          <TasksModule />
        </div>
      )}

      {activeTab === 'habitos' && (
        <div style={{ marginTop: '24px' }}>
          <HabitsModule />
        </div>
      )}

      {activeTab === 'bienestar' && (
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <HealthModule />
          <BandModule />
        </div>
      )}

      {activeTab === 'proyectos' && (
        <div style={{ marginTop: '24px' }}>
          <ProjectsModule />
        </div>
      )}

      {activeTab === 'compras' && (
        <div style={{ marginTop: '24px' }}>
          <ShoppingModule />
        </div>
      )}

      {activeTab === 'metas' && (
        <div style={{ marginTop: '24px' }}>
          <GoalsModule />
        </div>
      )}
    </div>
  );
};
