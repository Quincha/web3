import React, { useState, useEffect, useRef } from 'react';
import { Search, Terminal, Flame, Heart, BookOpen, Sun, Moon, Sparkles, CheckSquare, ShoppingBag, DollarSign, Calendar as CalendarIcon, FileText, UserCheck, Briefcase, User, Watch, ScrollText } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useTasks } from '../../context/TasksContext';
import { useBujo } from '../../context/BujoContext';
import { useClients } from '../../context/ClientsContext';
import { useShopping } from '../../context/ShoppingContext';

interface CommandOption {
  id: string;
  category: string;
  label: string;
  sublabel?: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { setTheme } = useTheme();
  const { tasks, projects } = useTasks();
  const { entries: bujoEntries } = useBujo();
  const { clients } = useClients();
  const { products: shoppingProducts } = useShopping();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const navigateTo = (view: string) => {
    window.dispatchEvent(new CustomEvent('change-view', { detail: view }));
    setIsOpen(false);
  };

  const BASE_COMMANDS: CommandOption[] = [
    // ── Vistas ──────────────────────
    { id: 'go_dash',     category: 'Módulo', label: 'Dashboard Principal', icon: <Terminal size={15} />, action: () => navigateTo('dashboard') },
    { id: 'go_pomo',     category: 'Módulo', label: 'Iniciar Enfoque Pomodoro', icon: <Flame size={15} />, action: () => navigateTo('pomodoro') },
    { id: 'go_bujo',     category: 'Módulo', label: 'Bullet Journal (BuJo)', icon: <BookOpen size={15} />, action: () => navigateTo('bujo') },
    { id: 'go_health',   category: 'Módulo', label: 'Salud, Fichas y Hábitos', icon: <Heart size={15} />, action: () => navigateTo('health') },
    { id: 'go_band',     category: 'Módulo', label: 'Mi Band 5 (Actividad)', icon: <Watch size={15} />, action: () => navigateTo('band') },
    { id: 'go_cal',      category: 'Módulo', label: 'Calendario y Horarios', icon: <CalendarIcon size={15} />, action: () => navigateTo('calendario') },
    { id: 'go_tasks',    category: 'Módulo', label: 'Gestión de Tareas', icon: <CheckSquare size={15} />, action: () => navigateTo('tareas') },
    { id: 'go_docs',     category: 'Módulo', label: 'Documentos y Notas', icon: <FileText size={15} />, action: () => navigateTo('documentos') },
    { id: 'go_finance',  category: 'Módulo', label: 'Finanzas e Ingresos', icon: <DollarSign size={15} />, action: () => navigateTo('finanzas') },
    { id: 'go_shopping', category: 'Módulo', label: 'Lista de Compras', icon: <ShoppingBag size={15} />, action: () => navigateTo('shopping') },
    { id: 'go_projects', category: 'Módulo', label: 'Proyectos Activos', icon: <Briefcase size={15} />, action: () => navigateTo('proyectos') },
    { id: 'go_clients',  category: 'Módulo', label: 'Directorio de Clientes', icon: <UserCheck size={15} />, action: () => navigateTo('clientes') },
    { id: 'go_registro', category: 'Módulo', label: 'Registro de Auditorías', icon: <ScrollText size={15} />, action: () => navigateTo('registro') },

    // ── Acciones / Temas ────────────
    { id: 'theme_dark',  category: 'Sistema', label: 'Activar Modo Oscuro', icon: <Moon size={15} />, action: () => { setTheme('dark'); setIsOpen(false); } },
    { id: 'theme_light', category: 'Sistema', label: 'Activar Modo Claro', icon: <Sun size={15} />, action: () => { setTheme('light'); setIsOpen(false); } },
    { id: 'theme_mixed', category: 'Sistema', label: 'Activar Modo Mixto', icon: <Sparkles size={15} />, action: () => { setTheme('mixed'); setIsOpen(false); } },
  ];

  // Dynamic Clients Commands (Roberto Gómez, Ana Martínez, etc.)
  const clientCommands: CommandOption[] = (clients || []).map(c => ({
    id: `cli_${c.id}`,
    category: 'Cliente',
    label: `${c.name} — ${c.company}`,
    sublabel: `${c.email} | ${c.phone}`,
    icon: <User size={15} color={c.color || '#3B82F6'} />,
    action: () => navigateTo('clientes')
  }));

  // Dynamic Projects Commands
  const projectCommands: CommandOption[] = (projects || []).map(p => ({
    id: `proj_${p.id}`,
    category: 'Proyecto',
    label: p.name,
    sublabel: p.description,
    icon: <Briefcase size={15} color={p.color || '#8B5CF6'} />,
    action: () => navigateTo('proyectos')
  }));

  // Dynamic Tasks Commands
  const taskCommands: CommandOption[] = (tasks || []).map(t => ({
    id: `task_${t.id}`,
    category: 'Tarea',
    label: `${t.title} (${t.status === 'completed' ? 'Completada' : 'Pendiente'})`,
    sublabel: t.description,
    icon: <CheckSquare size={15} color={t.status === 'completed' ? '#10B981' : '#F59E0B'} />,
    action: () => navigateTo('tareas')
  }));

  // Dynamic BuJo Entries Commands
  const bujoCommands: CommandOption[] = (bujoEntries || []).map(e => ({
    id: `bujo_${e.id}`,
    category: 'Bullet Journal',
    label: e.content,
    icon: <BookOpen size={15} color="#3B82F6" />,
    action: () => navigateTo('bujo')
  }));

  // Dynamic Shopping Product Commands
  const shoppingCommands: CommandOption[] = (shoppingProducts || []).map(s => ({
    id: `shop_${s.id}`,
    category: 'Compras',
    label: `${s.name} (${s.storeName})`,
    sublabel: `$${s.priceBase}`,
    icon: <ShoppingBag size={15} color="#EC4899" />,
    action: () => navigateTo('shopping')
  }));

  const COMMANDS = [...BASE_COMMANDS, ...clientCommands, ...projectCommands, ...taskCommands, ...bujoCommands, ...shoppingCommands];

  // Filter options based on query (checks label, category, sublabel)
  const filtered = COMMANDS.filter(cmd => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      (cmd.sublabel && cmd.sublabel.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-command-palette', handleOpen);
    return () => window.removeEventListener('open-command-palette', handleOpen);
  }, []);

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
        setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <div style={{ color: isSelected ? 'var(--accent-green)' : 'var(--text-subtle)', flexShrink: 0 }}>
                      {cmd.icon}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.88rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isSelected ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cmd.label}
                      </span>
                      {cmd.sublabel && (
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cmd.sublabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px', flexShrink: 0, marginLeft: '8px' }}>
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
