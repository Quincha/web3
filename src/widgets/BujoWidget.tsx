import React, { useState } from 'react';
import { ExternalLink, Clock, Plus, Circle, X, Minus, ArrowRight, ArrowLeft } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';
import { tokens } from '../theme/tokens';
import { useBujo } from '../context/BujoContext';
import type { BujoEntryType } from '../context/BujoContext';

const getBujoIcon = (type: BujoEntryType, color: string) => {
  switch (type) {
    case 'task': return <Circle size={10} color={color} fill={color} />;
    case 'completed': return <X size={14} color={color} strokeWidth={3} />;
    case 'note': return <Minus size={14} color={color} strokeWidth={3} />;
    case 'event': return <Circle size={12} color={color} />;
    case 'migrated': return <ArrowRight size={14} color={color} strokeWidth={2.5} />;
    case 'scheduled': return <ArrowLeft size={14} color={color} strokeWidth={2.5} />;
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
    default: return tokens.colors.text.primary;
  }
};

export const BujoWidget: React.FC = () => {
  const { getTodayEntries, addEntry, toggleEntryType } = useBujo();
  const entries = getTodayEntries();
  const [inputValue, setInputValue] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    // Simple heuristic: if starts with '-', it's a note. If starts with 'o', it's an event. Else, task.
    let type: BujoEntryType = 'task';
    let content = inputValue.trim();

    if (content.startsWith('- ')) {
      type = 'note';
      content = content.substring(2);
    } else if (content.startsWith('o ')) {
      type = 'event';
      content = content.substring(2);
    } else if (content.startsWith('> ')) {
      type = 'migrated';
      content = content.substring(2);
    } else if (content.startsWith('< ')) {
      type = 'scheduled';
      content = content.substring(2);
    } else if (content.startsWith('x ') || content.startsWith('X ')) {
      type = 'completed';
      content = content.substring(2);
    } else if (content.startsWith('• ') || content.startsWith('. ')) {
      type = 'task';
      content = content.substring(2);
    }

    addEntry(content, type);
    setInputValue('');
  };

  return (
    <div className="premium-card-hover" style={{
      background: 'linear-gradient(145deg, rgba(16, 42, 45, 0.4) 0%, rgba(6, 8, 11, 0.9) 100%)',
      borderRadius: '24px',
      padding: '28px',
      border: `1px solid ${tokens.colors.accent.green}40`,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Glow */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '150px',
        height: '150px',
        background: `radial-gradient(circle, ${tokens.colors.accent.green}30 0%, transparent 70%)`,
        filter: 'blur(30px)',
        zIndex: 0
      }}></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={20} color={tokens.colors.accent.green} />
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: tokens.colors.accent.green, letterSpacing: '0.1em', margin: 0 }}>
            DAILY LOG
          </h3>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingLeft: '8px', zIndex: 1 }}>
        {entries.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '12px' }}>
            Tu bitácora está vacía.
          </div>
        ) : (
          entries.slice(0, 5).map((entry, index) => {
            const timeStr = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:00';
            const color = getBujoColor(entry.type);
            const isCompleted = entry.type === 'completed';

            return (
              <div key={entry.id} style={{ display: 'flex', gap: '16px', minHeight: '44px', position: 'relative' }}>
                {/* Timeline line */}
                {index < entries.length - 1 && (
                  <div style={{ 
                    position: 'absolute', 
                    left: '60px', 
                    top: '24px', 
                    bottom: '-4px', 
                    width: '1px', 
                    backgroundColor: 'rgba(255,255,255,0.1)' 
                  }} />
                )}

                {/* Time */}
                <div style={{ width: '36px', paddingTop: '2px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 500 }}>
                    {timeStr}
                  </span>
                </div>
                
                {/* Dot and Content */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1 }}>
                  {/* Icon Dot */}
                  <button 
                    onClick={() => {
                      if (entry.type === 'task' || entry.type === 'completed') {
                        toggleEntryType(entry.id);
                      }
                    }}
                    style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      background: `linear-gradient(135deg, ${color}20, ${color}10)`, 
                      border: `1px solid ${color}40`,
                      color: color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1,
                      cursor: (entry.type === 'task' || entry.type === 'completed') ? 'pointer' : 'default',
                      padding: 0
                  }}>
                    {getBujoIcon(entry.type, color)}
                  </button>
                  
                  {/* Title */}
                  <div style={{ paddingTop: '3px', flex: 1 }}>
                    <span style={{ 
                      color: isCompleted ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)', 
                      fontSize: '13px', 
                      fontWeight: 400,
                      textDecoration: isCompleted ? 'line-through' : 'none'
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

      <form onSubmit={handleAdd} style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', gap: '8px', zIndex: 1 }}>
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Añadir (- nota, o evento, < prog, > mig, x comp, . tar)..." 
          style={{ 
            flex: 1, 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '16px',
            padding: '8px 12px',
            color: 'white',
            fontSize: '13px',
            outline: 'none'
          }}
        />
        <button type="submit" style={{ 
          background: tokens.colors.accent.green, 
          border: 'none', 
          width: '36px', 
          height: '36px', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#000',
          cursor: 'pointer'
        }}>
          <Plus size={16} />
        </button>
      </form>

      {/* Footer "Index" Button */}
      <button 
        style={{
          marginTop: '16px',
          width: '100%',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '10px',
          borderRadius: '12px',
          color: 'white',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          zIndex: 1,
          transition: 'all 0.2s'
        }}
        className="bujo-index-btn"
      >
        <ExternalLink size={14} /> Abrir Bullet Journal
      </button>
    </div>
  );
};

WidgetRegistry.register({
  id: 'bujo',
  name: 'Bullet Journal',
  description: 'Entradas del Bujo',
  component: BujoWidget
});

export default BujoWidget;
