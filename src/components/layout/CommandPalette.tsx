import React, { useState, useEffect, useRef } from 'react';
import { Search, Terminal, Flame, Heart, BookOpen, Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface CommandOption {
  id: string;
  category: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { setTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const navigateTo = (view: string) => {
    window.dispatchEvent(new CustomEvent('change-view', { detail: view }));
    setIsOpen(false);
  };

  const COMMANDS: CommandOption[] = [
    // ── Vistas ──────────────────────
    { id: 'go_dash',   category: 'Navegar', label: 'Ir al Dashboard', icon: <Terminal size={15} />, action: () => navigateTo('dashboard') },
    { id: 'go_pomo',   category: 'Navegar', label: 'Iniciar Pomodoro', icon: <Flame size={15} />, action: () => navigateTo('pomodoro') },
    { id: 'go_bujo',   category: 'Navegar', label: 'Ir a Bullet Journal', icon: <BookOpen size={15} />, action: () => navigateTo('bujo') },
    { id: 'go_health', category: 'Navegar', label: 'Ir a Salud y Fichas', icon: <Heart size={15} />, action: () => navigateTo('health') },
    { id: 'go_cal',    category: 'Navegar', label: 'Ir al Calendario', icon: <Terminal size={15} />, action: () => navigateTo('calendario') },
    { id: 'go_docs',   category: 'Navegar', label: 'Ir a Documentos', icon: <Terminal size={15} />, action: () => navigateTo('documentos') },

    // ── Acciones / Temas ────────────
    { id: 'theme_dark',  category: 'Sistema', label: 'Activar Modo Oscuro', icon: <Moon size={15} />, action: () => { setTheme('dark'); setIsOpen(false); } },
    { id: 'theme_light', category: 'Sistema', label: 'Activar Modo Claro', icon: <Sun size={15} />, action: () => { setTheme('light'); setIsOpen(false); } },
    { id: 'theme_mixed', category: 'Sistema', label: 'Activar Modo Mixto', icon: <Sparkles size={15} />, action: () => { setTheme('mixed'); setIsOpen(false); } },
  ];

  // Filter options based on query
  const filtered = COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to toggle command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      
      if (!isOpen) return;

      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setQuery('');
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh'
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          maxWidth: '550px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Input Bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border-color)', gap: '10px' }}>
          <Search size={18} style={{ color: 'var(--text-subtle)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Escribe un comando o navega por el sistema..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              fontFamily: 'inherit'
            }}
          />
          <kbd style={{ fontSize: '0.7rem', padding: '3px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-subtle)' }}>ESC</kbd>
        </div>

        {/* Options Scroller */}
        <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.88rem' }}>
              No se encontraron comandos coincidentes.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: isSelected ? 'var(--accent-green)' : 'var(--text-subtle)' }}>
                      {cmd.icon}
                    </div>
                    <span style={{ fontSize: '0.88rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isSelected ? 600 : 400 }}>
                      {cmd.label}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px' }}>
                    {cmd.category}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
export default CommandPalette;
