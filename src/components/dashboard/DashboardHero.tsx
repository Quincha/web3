import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import type { Theme } from '../../context/ThemeContext';
import { useBujo } from '../../context/BujoContext';
import { useTasks } from '../../context/TasksContext';
import { useInsights } from '../../context/InsightsContext';
import { useFinance } from '../../context/FinanceContext';
import { useHabits } from '../../context/HabitsContext';
import { useMessages } from '../../context/MessagesContext';
import { SyncStatusBar } from '../layout/SyncStatusBar';
import { WeatherWidget } from './WeatherWidget';
import { CheckCircle2, Search, Bell, Mail, Sparkles, Moon, Sun, Calendar, DollarSign, Plus, BookOpen } from 'lucide-react';
import { tokens } from '../../theme/tokens';

export const DashboardHero: React.FC = () => {
  const { userConfig } = useUser();
  const { getTodayEntries } = useBujo();
  const { tasks, updateTask } = useTasks();
  const { insights: _insights } = useInsights();
  const { stats: financeStats } = useFinance();
  const { habitsWithStats } = useHabits();
  const { messages, notifications, unreadMessages } = useMessages();
  const firstName = userConfig.userName.split(' ')[0];

  // Dynamic calculations for Progress Ring
  const healthHabits = habitsWithStats || [];
  const healthPercentage = healthHabits.length > 0 
    ? Math.round(healthHabits.reduce((acc, h) => acc + h.completionRate30d, 0) / healthHabits.length)
    : 0;

  const totalTasksCount = (tasks || []).length;
  const completedTasksCount = (tasks || []).filter(t => t.status === 'completed').length;
  const devPercentage = totalTasksCount > 0
    ? Math.round((completedTasksCount / totalTasksCount) * 100)
    : 0;

  const overallProgress = Math.round((healthPercentage + devPercentage) / 2);

  // Compute dynamic AI recommendations combining high priority tasks and insights
  const priorityScore = (p: string) => (p === 'urgent' ? 4 : p === 'high' ? 3 : p === 'medium' ? 2 : 1);
  const pendingTasks = (tasks || [])
    .filter(t => t.status !== 'completed')
    .sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority));

  const dynamicRecommendations = pendingTasks.slice(0, 3);

  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showMailMenu, setShowMailMenu] = useState(false);
  const [showBellMenu, setShowBellMenu] = useState(false);

  const recentMessages = messages.slice(0, 3);

  const recentNotifications = notifications.slice(0, 3);

  const themeOptions = [
    { id: 'dark' as Theme, label: 'Modo Oscuro', icon: <Moon size={16} /> },
    { id: 'light' as Theme, label: 'Modo Claro', icon: <Sun size={16} /> },
    { id: 'mixed' as Theme, label: 'Modo Mixto', icon: <Sparkles size={16} /> }
  ];

  const heroStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '24px',
    background: 'transparent',
    border: `1px solid rgba(255,255,255,0.05)`,
    boxShadow: tokens.shadows.elevation2,
    display: 'flex',
    flexDirection: 'column', // Changed to column to stack header and content
    marginBottom: 0,
    minHeight: '320px', // Slightly taller to accommodate header
    gap: '32px' // Gap between header and content
  };

  const backgroundGraphicsStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
    backgroundImage: 'url(/hero_aurora_wide.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    borderRadius: '24px',
    overflow: 'hidden',
    pointerEvents: 'none',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: `linear-gradient(to right, rgba(6, 8, 11, 0.98) 0%, rgba(6, 8, 11, 0.85) 45%, rgba(6, 8, 11, 0.4) 100%)`,
    zIndex: 2,
  };

  const columnStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 3,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  };

  return (
    <div style={heroStyle} className="dashboard-hero-responsive">
      {/* Background with Aurora parallax-like feel */}
      <div style={backgroundGraphicsStyle} className="hero-bg-anim">
        <div style={overlayStyle}></div>
      </div>

      {/* Embedded Top Navigation Bar */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        {/* Search Bar connected to Command Palette */}
        <div 
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            background: 'rgba(255,255,255,0.04)', 
            border: '1px solid rgba(255,255,255,0.12)', 
            borderRadius: '12px', 
            padding: '8px 14px', 
            width: '320px', 
            backdropFilter: 'blur(10px)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          className="search-bar-hover"
        >
          <Search size={16} color="rgba(255,255,255,0.5)" />
          <span style={{ marginLeft: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', flex: 1, userSelect: 'none' }}>
            Buscar en Quincha Systems...
          </span>
          <kbd style={{ 
            fontSize: '10px', 
            fontWeight: 600, 
            padding: '2px 6px', 
            background: 'rgba(255,255,255,0.08)', 
            border: '1px solid rgba(255,255,255,0.15)', 
            borderRadius: '4px', 
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: '0.05em'
          }}>
            ⌘K
          </kbd>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <SyncStatusBar />
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
            >
              {theme === 'dark' && <Moon size={16} />}
              {theme === 'light' && <Sun size={16} />}
              {theme === 'mixed' && <Sparkles size={16} />}
            </button>
            
            {showThemeMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px', backdropFilter: 'blur(20px)' }}>
                {themeOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setTheme(opt.id); setShowThemeMenu(false); }}
                    style={{ background: theme === opt.id ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '12px', color: '#fff', cursor: 'pointer', fontSize: '13px', textAlign: 'left' }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mail Messages Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => { setShowMailMenu(!showMailMenu); setShowBellMenu(false); setShowThemeMenu(false); }}
              style={{ background: showMailMenu ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', position: 'relative', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}
              title="Mensajes directos"
            >
              <Mail size={16} />
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: tokens.colors.accent.danger, color: '#fff', fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadMessages}</span>
            </button>

            {showMailMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'rgba(15, 23, 42, 0.98)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', width: '300px', backdropFilter: 'blur(20px)', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 100 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>MENSAJES RECIENTES</span>
                  <span style={{ fontSize: '10px', color: tokens.colors.accent.green, fontWeight: 600 }}>{unreadMessages} Sin leer</span>
                </div>
                
                {recentMessages.map(msg => (
                  <div 
                    key={msg.id}
                    onClick={() => { setShowMailMenu(false); window.dispatchEvent(new CustomEvent('change-view', { detail: 'mensajes' })); }}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{msg.sender}</span>
                      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>{msg.time}</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.3 }}>{msg.text}</p>
                  </div>
                ))}

                <button 
                  onClick={() => { setShowMailMenu(false); window.dispatchEvent(new CustomEvent('change-view', { detail: 'mensajes' })); }}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textAlign: 'center', marginTop: '4px' }}
                >
                  Ver todos los mensajes →
                </button>
              </div>
            )}
          </div>

          {/* Bell Notifications Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => { setShowBellMenu(!showBellMenu); setShowMailMenu(false); setShowThemeMenu(false); }}
              style={{ background: showBellMenu ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', position: 'relative', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}
              title="Notificaciones y alertas"
            >
              <Bell size={16} />
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: tokens.colors.accent.warning, color: '#111', fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{notifications.length}</span>
            </button>

            {showBellMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'rgba(15, 23, 42, 0.98)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', width: '320px', backdropFilter: 'blur(20px)', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 100 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>NOTIFICACIONES DE SISTEMA</span>
                  <span style={{ fontSize: '10px', color: '#FBBF24', fontWeight: 600 }}>{notifications.length} Alertas</span>
                </div>
                
                {recentNotifications.map(notif => (
                  <div 
                    key={notif.id}
                    style={{ background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${notif.type === 'warning' ? '#FBBF24' : notif.type === 'success' ? '#10B981' : '#38BDF8'}`, borderRadius: '6px', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{notif.title}</span>
                      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>{notif.time}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.3 }}>{notif.desc}</span>
                  </div>
                ))}

                <button 
                  onClick={() => setShowBellMenu(false)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textAlign: 'center', marginTop: '4px' }}
                >
                  Marcar todas como leídas
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Hero Content (Columns Row) */}
      <div className="hero-content-row" style={{ position: 'relative', zIndex: 3 }}>
        {/* ZONA 1: Welcome & AI Focus */}
        <div className="hero-zone-welcome" style={columnStyle}>
        <h1 className="outfit" style={{
          fontSize: '40px',
          fontWeight: 700,
          color: '#FFFFFF',
          lineHeight: 1.1,
          marginBottom: '24px',
          letterSpacing: '-0.02em',
        }}>
          ¡Bienvenido de nuevo,<br/>{firstName}!
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '11px', color: tokens.colors.accent.green, fontWeight: 700, marginBottom: '2px', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={13} color={tokens.colors.accent.green} />
            <span>IA: HOY DEBERÍAS CONCENTRARTE EN</span>
          </div>
          
          {dynamicRecommendations.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
              <CheckCircle2 size={16} color={tokens.colors.accent.green} />
              <span>¡Todo al día! No tienes tareas urgentes pendientes por ahora.</span>
            </div>
          ) : (
            dynamicRecommendations.map((t) => (
              <div key={t.id} className="group" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <button 
                  onClick={() => updateTask(t.id, { status: 'completed' })}
                  style={{ 
                    marginTop: '2px', 
                    background: 'transparent', 
                    border: 'none', 
                    cursor: 'pointer', 
                    padding: 0, 
                    display: 'flex', 
                    alignItems: 'center',
                    filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))',
                    transition: 'transform 0.15s ease'
                  }}
                  title="Marcar tarea como completada"
                >
                  <CheckCircle2 size={16} color={tokens.colors.accent.green} />
                </button>
                <div 
                  onClick={() => window.dispatchEvent(new CustomEvent('change-view', { detail: 'tareas' }))}
                  style={{ cursor: 'pointer', flex: 1 }}
                >
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{t.title}</span>
                    {t.priority === 'urgent' && (
                      <span style={{ fontSize: '9px', background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '4px', padding: '1px 5px', fontWeight: 700 }}>
                        URGENTE
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', lineHeight: 1.4 }}>
                    {t.description || `${t.category || 'Tarea general'} — Categoría activa`}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ZONA 2: 2x2 Streamlined Grid */}
      <div className="hero-zone-stats" style={{ ...columnStyle, alignItems: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={18} color="rgba(255,255,255,0.6)" />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{pendingTasks.length}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Tareas</div>
              </div>
            </div>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('change-view', { detail: 'tareas' }))}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              title="Ir a Tareas"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar size={18} color="rgba(255,255,255,0.6)" />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>0</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Reuniones</div>
              </div>
            </div>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('change-view', { detail: 'calendario' }))}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              title="Ir a Calendario"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <DollarSign size={18} color={tokens.colors.accent.green} style={{ filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))'}} />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{financeStats?.receivablesCount ?? 0}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Cobro</div>
              </div>
            </div>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('change-view', { detail: 'finanzas' }))}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              title="Ir a Finanzas"
            >
              <Plus size={14} />
            </button>
          </div>
          
          {/* Módulo de Bullet Journal / Aviso de hoy (Estilo Compacto) */}
          {(() => {
            const todayCount = getTodayEntries().length;
            const hasBulletToday = todayCount > 0;
            const activeColor = hasBulletToday ? tokens.colors.accent.green : '#F59E0B';

            return (
              <div style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: `1px solid ${hasBulletToday ? 'rgba(255,255,255,0.08)' : 'rgba(245, 158, 11, 0.3)'}`, 
                borderRadius: '12px', 
                padding: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: hasBulletToday ? 'none' : '0 0 10px rgba(245, 158, 11, 0.12)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <BookOpen 
                    size={18} 
                    color={activeColor} 
                    style={{ filter: `drop-shadow(0 0 6px ${hasBulletToday ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.5)'})` }} 
                  />
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                      {todayCount}
                    </div>
                    <div style={{ fontSize: '10px', color: hasBulletToday ? 'rgba(255,255,255,0.4)' : '#FBBF24', marginTop: '2px', fontWeight: hasBulletToday ? 400 : 600 }}>
                      Bullet Journal
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('change-view', { detail: 'bujo' }))}
                  style={{ 
                    background: hasBulletToday ? 'rgba(255,255,255,0.1)' : 'rgba(245, 158, 11, 0.25)', 
                    border: 'none', 
                    borderRadius: '50%', 
                    width: '24px', 
                    height: '24px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: 'pointer', 
                    color: '#fff', 
                    transition: 'all 0.2s' 
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = hasBulletToday ? 'rgba(255,255,255,0.2)' : 'rgba(245, 158, 11, 0.4)'}
                  onMouseLeave={e => e.currentTarget.style.background = hasBulletToday ? 'rgba(255,255,255,0.1)' : 'rgba(245, 158, 11, 0.25)'}
                  title="Ir a Bullet Journal"
                >
                  <Plus size={14} />
                </button>
              </div>
            );
          })()}

        </div>
      </div>

      {/* ZONA 3: Tiempo y Pronóstico Interactivo */}
      <div className="hero-weather-zone" style={{ position: 'relative', zIndex: 3 }}>
        <WeatherWidget />
      </div>

      {/* ZONA 4: Multi-Ring Progress */}
      <div className="hero-progress-ring" style={{ position: 'relative', zIndex: 3 }}>
        <div style={{ position: 'relative', width: '200px', height: '200px' }}>
          
          <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
            
            {/* Outer Ring Background (Aprendizaje) */}
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(251, 191, 36, 0.05)" strokeWidth="6" strokeDasharray="10 5" />
            {/* Outer Ring Progress (Aprendizaje y Desarrollo) */}
            <circle cx="100" cy="100" r="90" fill="none" stroke="#D97706" strokeWidth="6" strokeLinecap="round" 
              strokeDasharray="565.48" strokeDashoffset={565.48 - (565.48 * (devPercentage / 100))} style={{ transition: 'stroke-dashoffset 1s ease-out' }} />

            {/* Middle Ring Background (Salud) */}
            <circle cx="100" cy="100" r="74" fill="none" stroke="rgba(45, 212, 191, 0.05)" strokeWidth="8" strokeDasharray="10 5" />
            {/* Middle Ring Progress (Salud y Bienestar) */}
            <circle cx="100" cy="100" r="74" fill="none" stroke="#2DD4BF" strokeWidth="8" strokeLinecap="round" 
              strokeDasharray="464.96" strokeDashoffset={464.96 - (464.96 * (healthPercentage / 100))} style={{ transition: 'stroke-dashoffset 1s ease-out', filter: 'drop-shadow(0 0 6px rgba(45, 212, 191, 0.4))' }} />

            {/* Inner Ring Background (Progreso Semanal) */}
            <circle cx="100" cy="100" r="56" fill="none" stroke="rgba(251, 191, 36, 0.15)" strokeWidth="10" />
            {/* Inner Ring Progress (Progreso General) */}
            <circle cx="100" cy="100" r="56" fill="none" stroke="#FBBF24" strokeWidth="10" strokeLinecap="round" 
              strokeDasharray="351.86" strokeDashoffset={351.86 - (351.86 * (overallProgress / 100))} style={{ transition: 'stroke-dashoffset 1s ease-out', filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.5))' }} />
              
          </svg>

          {/* Inner Label (Overall Progress) */}
          <div className="outfit" style={{ 
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', fontWeight: 700, color: '#FBBF24', letterSpacing: '-0.02em',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
          }}>
            {overallProgress}<span style={{ fontSize: '16px', color: 'rgba(251, 191, 36, 0.7)', marginLeft: '2px' }}>%</span>
          </div>

          {/* Top Label */}
          <div style={{ position: 'absolute', top: '-12px', left: 0, right: 0, textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.05em' }}>
            PROGRESO SEMANAL
          </div>
          
          {/* Bottom Left Label */}
          <div style={{ position: 'absolute', bottom: '-4px', left: '-12px', textAlign: 'center', fontSize: '10px', color: '#2DD4BF', fontWeight: 700, lineHeight: 1.2 }}>
            ({healthPercentage}%)<br/><span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '8px', fontWeight: 600 }}>SALUD Y<br/>BIENESTAR</span>
          </div>
          
          {/* Bottom Right Label */}
          <div style={{ position: 'absolute', bottom: '-4px', right: '-16px', textAlign: 'center', fontSize: '10px', color: '#D97706', fontWeight: 700, lineHeight: 1.2 }}>
            ({devPercentage}%)<br/><span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '8px', fontWeight: 600 }}>APRENDIZAJE Y<br/>DESARROLLO</span>
          </div>

        </div>
      </div>

      </div>
    </div>
  );
};
