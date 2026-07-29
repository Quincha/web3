import React, { useState } from 'react';
import { ExternalLink, Clock, Plus, Circle, CheckCircle2, Minus, Calendar } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';
import { tokens } from '../theme/tokens';
import { useBujo } from '../context/BujoContext';
import type { BujoEntryType } from '../context/BujoContext';

const getBujoIcon = (type: BujoEntryType, color: string) => {
  switch (type) {
    case 'task': return <Circle size={12} color={color} />;
    case 'completed': return <CheckCircle2 size={12} color={color} />;
    case 'note': return <Minus size={12} color={color} />;
    case 'event': return <Calendar size={12} color={color} />;
    case 'migrated': return <ExternalLink size={12} color={color} />;
    default: return <Circle size={12} color={color} />;
  }
};

const getBujoColor = (type: BujoEntryType) => {
  switch (type) {
    case 'task': return tokens.colors.text.primary;
    case 'completed': return tokens.colors.accent.green;
    case 'note': return tokens.colors.text.secondary;
    case 'event': return tokens.colors.accent.cyan;
    case 'migrated': return tokens.colors.accent.warning;
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
    } else if (content.startsWith('• ')) {
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
            DAILY LOG (BUJO)
          </h3>
        </div>
        <button style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
          <ExternalLink size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingLeft: '8px', zIndex: 1 }}>
        {entries.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '12px' }}>
            Tu bitácora está vacía.
          </div>
        ) : (
          entries.map((entry, index) => {
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

      <form onSubmit={handleAdd} style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', gap: '8px' }}>
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Añadir nota (- nota, o evento)..." 
          style={{ 
            flex: 1, 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '16px',
            padding: '8px 12px',
            color: 'white',
            fontSize: '12px',
            outline: 'none'
          }} 
        />
        <button 
          type="submit"
          style={{ 
            background: tokens.colors.accent.green, 
            color: '#000', 
            border: 'none', 
            borderRadius: '50%', 
            width: '32px', 
            height: '32px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Plus size={16} />
        </button>
      </form>
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
