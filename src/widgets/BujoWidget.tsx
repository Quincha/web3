import React, { useState,  useEffect } from 'react';
import { ExternalLink, Clock, Plus, Circle, X, Minus, ArrowRight, ArrowLeft,  CheckCircle2 } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';
import { tokens } from '../theme/tokens';
import { useBujo } from '../context/BujoContext';
import { useHabits } from '../context/HabitsContext';
import { useTasks } from '../context/TasksContext';
import type { BujoEntryType } from '../context/BujoContext';

const getBujoIcon = (type: BujoEntryType, color: string) => {
  switch (type) {
    case 'task': return <Circle size={10} color={color} fill={color} />;
    case 'completed': return <X size={14} color={color} strokeWidth={3} />;
    case 'note': return <Minus size={14} color={color} strokeWidth={3} />;
    case 'event': return <Circle size={12} color={color} />;
    case 'migrated': return <ArrowRight size={14} color={color} strokeWidth={2.5} />;
    case 'scheduled': return <ArrowLeft size={14} color={color} strokeWidth={2.5} />;
    case 'cancelled': return <X size={14} color={color} strokeWidth={2.5} />;
    default: return <Circle size={12} color={color} />;
  }
};

const getBujoColor = (type: BujoEntryType) => {
  switch (type) {
    case 'task': return tokens.colors.text.primary;
    case 'completed': return tokens.colors.accent.green;
    case 'note': return tokens.colors.text.secondary;
    case 'event': return tokens.colors.text.primary;
    case 'migrated': return tokens.colors.accent.cyan;
    case 'scheduled': return tokens.colors.accent.warning;
    case 'cancelled': return 'rgba(255,255,255,0.2)';
    default: return tokens.colors.text.primary;
  }
};

const getLocalISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const BujoWidget: React.FC = () => {
  const { getTodayEntries, addEntry, toggleEntryType, updateEntry, getDailyMood, setDailyMood } = useBujo();
  const { habitsWithStats, toggleHabitToday } = useHabits();
  const { addTask, completeTask, migrateTask } = useTasks();
  
  const entries = getTodayEntries().slice(0, 5);
  const [inputValue, setInputValue] = useState('');
  
  // Menu and Mood state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const todayISO = getLocalISO(new Date());
  const currentMood = getDailyMood(todayISO) || 0;

  // Active habits limited to top 4 for the Quick Check bar
  const quickHabits = habitsWithStats.filter(h => !h.archived).slice(0, 4);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    let type: BujoEntryType = 'task';
    let rawContent = inputValue.trim();

    if (rawContent.startsWith('- ')) {
      type = 'note'; rawContent = rawContent.substring(2);
    } else if (rawContent.startsWith('o ') || rawContent.startsWith('O ')) {
      type = 'event'; rawContent = rawContent.substring(2);
    } else if (rawContent.startsWith('> ') || rawContent.startsWith('-> ')) {
      type = 'migrated'; rawContent = rawContent.substring(2).trim();
    } else if (rawContent.startsWith('< ') || rawContent.startsWith('<- ')) {
      type = 'scheduled'; rawContent = rawContent.substring(2).trim();
    } else if (rawContent.startsWith('x ') || rawContent.startsWith('X ') || rawContent.startsWith('v ')) {
      type = 'completed'; rawContent = rawContent.substring(2);
    } else if (rawContent.startsWith('• ') || rawContent.startsWith('. ')) {
      type = 'task'; rawContent = rawContent.substring(2);
    }

    let content = rawContent;
    if (content.length > 0) {
      content = content.charAt(0).toUpperCase() + content.slice(1);
    }

    let linkedTaskId: string | undefined = undefined;
    if (type === 'task') {
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

    addEntry(content, type, [], undefined, undefined, undefined, linkedTaskId);
    setInputValue('');
  };

  // Close menu on outside click
  useEffect(() => {
    const handleClick = () => setMenuOpenId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="dashboard-card">
      {/* 1. CABECERA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={20} color={tokens.colors.accent.green} />
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: tokens.colors.accent.green, letterSpacing: '0.1em', margin: 0 }}>
            DAILY LOG (BUJO)
          </h3>
        </div>
        
        {/* Indicador de Estado/Ánimo */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setDailyMood(todayISO, star)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                color: currentMood >= star ? tokens.colors.accent.warning : 'rgba(255,255,255,0.1)',
                transition: 'color 0.2s', fontSize: '14px'
              }}
              title={`Calificar día: ${star} estrellas`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* 2. HÁBITOS RÁPIDOS */}
      {quickHabits.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', zIndex: 1, overflowX: 'auto', paddingBottom: '4px' }}>
          {quickHabits.map(habit => (
            <button
              key={habit.id}
              onClick={() => toggleHabitToday(habit.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '12px',
                background: habit.completedToday ? `${tokens.colors.accent.green}20` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${habit.completedToday ? tokens.colors.accent.green : 'rgba(255,255,255,0.1)'}`,
                color: habit.completedToday ? tokens.colors.accent.green : 'white',
                fontSize: '12px', cursor: 'pointer',
                transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              <span style={{ fontSize: '14px' }}>{habit.icon}</span>
              {habit.name}
              {habit.completedToday && <CheckCircle2 size={12} />}
            </button>
          ))}
        </div>
      )}

      {/* 3. TIMELINE DEL DÍA */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingLeft: '8px', zIndex: 1, overflowY: 'auto', marginBottom: '16px' }}>
        {entries.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', paddingTop: '20px' }}>
            No hay entradas hoy...
          </div>
        ) : (
          entries.map((entry, index) => {
            const timeStr = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:00';
            const color = getBujoColor(entry.type);
            const isCompletedOrCancelled = entry.type === 'completed' || entry.type === 'cancelled';

            return (
              <div key={entry.id} style={{ display: 'flex', gap: '16px', minHeight: '44px', position: 'relative' }}>
                {/* Timeline line */}
                {index < entries.length - 1 && (
                  <div style={{ 
                    position: 'absolute', left: '60px', top: '24px', bottom: '-4px', 
                    width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' 
                  }} />
                )}

                {/* Time */}
                <div style={{ width: '55px', paddingTop: '2px', flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 500 }}>
                    {timeStr}
                  </span>
                </div>
                
                {/* Dot and Content */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1 }}>
                  {/* Icon Dot with Context Menu */}
                  <div style={{ position: 'relative' }}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (entry.type !== 'note' && entry.type !== 'event') {
                          setMenuOpenId(menuOpenId === entry.id ? null : entry.id);
                        }
                      }}
                      style={{ 
                        width: '24px', height: '24px', borderRadius: '50%', 
                        background: `linear-gradient(135deg, ${color}20, ${color}10)`, 
                        border: `1px solid ${color}40`,
                        color: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2, cursor: (entry.type !== 'note' && entry.type !== 'event') ? 'pointer' : 'default', padding: 0
                    }}>
                      {getBujoIcon(entry.type, color)}
                    </button>

                    {/* Context Menu Dropdown */}
                    {menuOpenId === entry.id && (
                      <div style={{
                        position: 'absolute', left: '28px', top: 0,
                        background: '#18181B', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', padding: '4px', zIndex: 10,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '2px'
                      }}>
                        <button onClick={() => { 
                          toggleEntryType(entry.id, 'completed'); 
                          setMenuOpenId(null); 
                          if (entry.linkedTaskId) completeTask(entry.linkedTaskId);
                        }} style={dropdownBtnStyle}>
                          <X size={12} strokeWidth={3} color={tokens.colors.accent.green} /> Completar
                        </button>
                        <button onClick={() => { toggleEntryType(entry.id, 'migrated'); setMenuOpenId(null); if (entry.linkedTaskId) { const nd = migrateTask(entry.linkedTaskId, entry.date); if (nd) updateEntry(entry.id, { date: nd }); } }} style={dropdownBtnStyle}>
                          <ArrowRight size={12} color={tokens.colors.accent.cyan} /> Migrar ({">"})
                        </button>
                        <button onClick={() => { toggleEntryType(entry.id, 'scheduled'); setMenuOpenId(null); }} style={dropdownBtnStyle}>
                          <ArrowLeft size={12} color={tokens.colors.accent.warning} /> Programar ({"<"})
                        </button>
                        <button onClick={() => { toggleEntryType(entry.id, 'cancelled'); setMenuOpenId(null); }} style={{ ...dropdownBtnStyle, color: '#A1A1AA' }}>
                          <X size={12} /> Descartar
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Title */}
                  <div style={{ paddingTop: '3px', flex: 1 }}>
                    <span style={{ 
                      color: isCompletedOrCancelled ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)', 
                      fontSize: '13px', fontWeight: 400,
                      textDecoration: isCompletedOrCancelled ? 'line-through' : 'none'
                    }}>
                      {entry.content}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. QUICK INPUT */}
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', zIndex: 1 }}>
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="+ Añadir nota o evento rápido..." 
          style={{ 
            flex: 1, background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
            padding: '8px 12px', color: 'white', fontSize: '13px', outline: 'none'
          }}
        />
        <button type="submit" style={{ 
          background: tokens.colors.accent.green, border: 'none', 
          width: '36px', height: '36px', borderRadius: '50%', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#000', cursor: 'pointer'
        }}>
          <Plus size={16} />
        </button>
      </form>

      {/* 5. FOOTER BUTTON */}
      <button 
        onClick={() => {
          window.dispatchEvent(new CustomEvent('change-view', { detail: 'bujo' }));
          window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: 'bujo' }));
        }}
        style={{
          marginTop: '12px', width: '100%', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)', padding: '10px',
          borderRadius: '12px', color: 'white', fontSize: '13px',
          cursor: 'pointer', display: 'flex', justifyContent: 'center',
          alignItems: 'center', gap: '8px', zIndex: 1, transition: 'all 0.2s'
        }}
        className="bujo-index-btn"
      >
        <ExternalLink size={14} /> Abrir Bullet Journal
      </button>
    </div>
  );
};

const dropdownBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left',
  background: 'transparent', border: 'none', color: 'white',
  padding: '6px 12px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer',
  whiteSpace: 'nowrap'
};

WidgetRegistry.register({
  id: 'BujoWidget',
  name: 'Bullet Journal',
  description: 'Módulo Bullet Journal',
  defaultSize: 'large',
  component: BujoWidget,
});
