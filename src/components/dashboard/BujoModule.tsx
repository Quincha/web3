import React, { useState, useRef, useEffect } from 'react';
import { useBujo } from '../../context/BujoContext';
import type { BujoEntryType } from '../../context/BujoContext';
import { Trash2, Circle, CheckCircle2, ArrowRight, Minus, Calendar, Tag, Plus } from 'lucide-react';

// Bullet Journal entry type symbols
const BUJO_SYMBOLS: Record<BujoEntryType, { icon: React.ReactNode; label: string; color: string }> = {
  task:      { icon: <Circle size={14} />,       label: 'Tarea',    color: 'var(--text-primary)' },
  completed: { icon: <CheckCircle2 size={14} />, label: 'Completada', color: 'var(--accent-green)' },
  migrated:  { icon: <ArrowRight size={14} />,   label: 'Migrada',  color: '#3B82F6' },
  note:      { icon: <Minus size={14} />,         label: 'Nota',     color: '#9CA3AF' },
  event:     { icon: <Calendar size={14} />,      label: 'Evento',   color: '#8B5CF6' },
};

export const BujoModule: React.FC = () => {
  const { entries, addEntry, deleteEntry, toggleEntryType, getTodayEntries } = useBujo();
  const [inputValue, setInputValue] = useState('');
  const [selectedType, setSelectedType] = useState<BujoEntryType>('task');
  const [activeView, setActiveView] = useState<'daily' | 'all'>('daily');
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayEntries = activeView === 'daily' ? getTodayEntries() : entries;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    addEntry(inputValue.trim(), selectedType);
    setInputValue('');
    inputRef.current?.focus();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bujo-module-container">
      {/* Header */}
      <div className="module-title-row">
        <div className="bujo-title-block">
          <h2>Bullet Journal</h2>
          <p className="module-subtitle">{formatDate(today)}</p>
        </div>
        <div className="bujo-view-toggle">
          <button
            className={`view-toggle-btn ${activeView === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveView('daily')}
          >
            Daily Log
          </button>
          <button
            className={`view-toggle-btn ${activeView === 'all' ? 'active' : ''}`}
            onClick={() => setActiveView('all')}
          >
            Todo el registro
          </button>
        </div>
      </div>

      {/* Quick input */}
      <div className="bujo-quick-input-card">
        {/* Type selector pills */}
        <div className="bujo-type-selector">
          {(Object.keys(BUJO_SYMBOLS) as BujoEntryType[]).map(type => {
            const sym = BUJO_SYMBOLS[type];
            return (
              <button
                key={type}
                className={`bujo-type-pill ${selectedType === type ? 'active' : ''}`}
                onClick={() => setSelectedType(type)}
                style={{ '--pill-color': sym.color } as React.CSSProperties}
              >
                <span className="pill-icon">{sym.icon}</span>
                <span className="pill-label">{sym.label}</span>
              </button>
            );
          })}
        </div>

        {/* Input row */}
        <form onSubmit={handleSubmit} className="bujo-input-row">
          <div className="bujo-entry-symbol-badge" style={{ color: BUJO_SYMBOLS[selectedType].color }}>
            {BUJO_SYMBOLS[selectedType].icon}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Escribe una entrada rápida..."
            className="bujo-text-input"
            autoFocus
          />
          <button type="submit" className="action-green-btn" style={{ minWidth: '100px' }}>
            <Plus size={14} />
            Agregar
          </button>
        </form>
      </div>

      {/* Entry List */}
      <div className="bujo-entries-card">
        {displayEntries.length === 0 ? (
          <div className="bujo-empty-state">
            <p>No hay entradas para hoy.</p>
            <p className="bujo-hint">Usa el campo de arriba para comenzar tu registro diario.</p>
          </div>
        ) : (
          <div className="bujo-entry-list">
            {displayEntries.map(entry => {
              const sym = BUJO_SYMBOLS[entry.type];
              return (
                <div
                  key={entry.id}
                  className={`bujo-entry-row entry-${entry.type}`}
                >
                  {/* Clickable symbol to toggle task/completed */}
                  <button
                    className="bujo-symbol-btn"
                    onClick={() => toggleEntryType(entry.id)}
                    style={{ color: sym.color }}
                    title={`Tipo: ${sym.label} — Clic para cambiar`}
                  >
                    {sym.icon}
                  </button>

                  <div className="bujo-entry-content">
                    <span className="bujo-entry-text">{entry.content}</span>
                    {entry.pomodoroRef && (
                      <span className="bujo-pomodoro-ref">
                        🍅 Sesión de Pomodoro
                      </span>
                    )}
                    {activeView === 'all' && (
                      <span className="bujo-entry-date">{formatDate(entry.date)}</span>
                    )}
                  </div>

                  {entryToDelete === entry.id ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--accent-danger)' }}>¿Borrar?</span>
                      <button className="bujo-delete-btn" onClick={() => setEntryToDelete(null)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>No</button>
                      <button className="bujo-delete-btn" onClick={() => { deleteEntry(entry.id); setEntryToDelete(null); }} style={{ background: 'var(--accent-danger)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>Sí</button>
                    </div>
                  ) : (
                    <div className="bujo-entry-meta">
                      {entry.tags.map(tag => (
                        <span key={tag} className="bujo-tag">
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                      <button
                        className="bujo-delete-btn"
                        onClick={() => setEntryToDelete(entry.id)}
                        title="Eliminar entrada"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bujo-legend-row">
        {(Object.entries(BUJO_SYMBOLS) as [BujoEntryType, typeof BUJO_SYMBOLS[BujoEntryType]][]).map(([type, sym]) => (
          <div key={type} className="legend-item" style={{ color: sym.color }}>
            {sym.icon}
            <span>{sym.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
