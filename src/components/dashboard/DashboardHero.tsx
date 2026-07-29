import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import type { Theme } from '../../context/ThemeContext';
import { SyncStatusBar } from '../layout/SyncStatusBar';
import { WeatherWidget } from './WeatherWidget';
import { CheckCircle2, Search, Bell, Mail, Sparkles, Moon, Sun, Calendar, DollarSign, Phone, CloudRain, Plus } from 'lucide-react';
import { tokens } from '../../theme/tokens';

export const DashboardHero: React.FC = () => {
  const { userConfig } = useUser();
  const firstName = userConfig.userName.split(' ')[0];

  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const themeOptions = [
    { id: 'dark' as Theme, label: 'Modo Oscuro', icon: <Moon size={16} /> },
    { id: 'light' as Theme, label: 'Modo Claro', icon: <Sun size={16} /> },
    { id: 'mixed' as Theme, label: 'Modo Mixto', icon: <Sparkles size={16} /> }
  ];

  const heroStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '24px',
    padding: '24px 40px 36px 40px', // Adjusted top padding for header
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

  const dividerStyle: React.CSSProperties = {
    width: '1px',
    background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 100%)',
    margin: '0 8px'
  };

  return (
    <div style={heroStyle} className="dashboard-hero-responsive">
      {/* Background with Aurora parallax-like feel */}
      <div style={backgroundGraphicsStyle} className="hero-bg-anim">
        <div style={overlayStyle}></div>
      </div>

      {/* Embedded Top Navigation Bar */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '8px 16px', width: '300px', backdropFilter: 'blur(10px)' }}>
          <Search size={16} color="rgba(255,255,255,0.5)" />
          <input 
            type="text" 
            placeholder="Buscar en Quincha Systems..." 
            style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', marginLeft: '12px', width: '100%', fontSize: '14px' }}
          />
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

          <button style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', position: 'relative', backdropFilter: 'blur(10px)' }}>
            <Mail size={16} />
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: tokens.colors.accent.danger, color: '#fff', fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
          </button>

          <button style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', position: 'relative', backdropFilter: 'blur(10px)' }}>
            <Bell size={16} />
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: tokens.colors.accent.warning, color: '#111', fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
          </button>
        </div>
      </div>

      {/* Main Hero Content (Columns Row) */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch', flex: 1, gap: '24px' }}>
        {/* ZONA 1: Welcome & AI Focus */}
        <div style={{ ...columnStyle, flex: '1.2', minWidth: '320px' }}>
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
          <div style={{ fontSize: '11px', color: tokens.colors.accent.green, fontWeight: 700, marginBottom: '2px', letterSpacing: '0.08em' }}>
            IA: HOY DEBERÍAS CONCENTRARTE EN
          </div>
          
          {/* Task 1 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ marginTop: '2px', filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))' }}>
              <CheckCircle2 size={16} color={tokens.colors.accent.green} />
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>Cobrar factura pendiente</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', lineHeight: 1.4 }}>
                Cobrar factura pendiente co estonelaqa y finattoar hage
              </div>
            </div>
          </div>
          
          {/* Task 2 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ marginTop: '2px', filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))' }}>
              <CheckCircle2 size={16} color={tokens.colors.accent.green} />
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>Finalizar Landing Page</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', lineHeight: 1.4 }}>
                Finalizar landing Page completia a dirmabum
              </div>
            </div>
          </div>

          {/* Task 3 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ marginTop: '2px', filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))' }}>
              <CheckCircle2 size={16} color={tokens.colors.accent.green} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>
                Llamar cliente EcoQuin
                <Phone size={12} color="rgba(255,255,255,0.5)" />
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', lineHeight: 1.4 }}>
                Llamar cliente EcoQuin con tu una cliente de sostelfuir acvir
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ZONA 2: 2x2 Streamlined Grid */}
      <div style={{ ...columnStyle, flex: '0.8', minWidth: '180px', alignItems: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={18} color="rgba(255,255,255,0.6)" />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>5</div>
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
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>2</div>
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
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>1</div>
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
          
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CloudRain size={18} color={tokens.colors.accent.cyan} style={{ filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.4))'}} />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>1</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Tiempo</div>
            </div>
          </div>

        </div>
      </div>

      {/* ZONA 3: Tiempo y Pronóstico Interactivo */}
      <WeatherWidget />

      {/* ZONA 4: Multi-Ring Progress */}
      <div style={{ ...columnStyle, flex: '1.2', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: '200px', height: '200px' }}>
          
          <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
            
            {/* Outer Ring Background (Aprendizaje) */}
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(251, 191, 36, 0.05)" strokeWidth="6" strokeDasharray="10 5" />
            {/* Outer Ring Progress (60%) */}
            <circle cx="100" cy="100" r="90" fill="none" stroke="#D97706" strokeWidth="6" strokeLinecap="round" 
              strokeDasharray="565.48" strokeDashoffset={565.48 - (565.48 * 0.6)} style={{ transition: 'stroke-dashoffset 1s ease-out' }} />

            {/* Middle Ring Background (Salud) */}
            <circle cx="100" cy="100" r="74" fill="none" stroke="rgba(45, 212, 191, 0.05)" strokeWidth="8" strokeDasharray="10 5" />
            {/* Middle Ring Progress (85%) */}
            <circle cx="100" cy="100" r="74" fill="none" stroke="#2DD4BF" strokeWidth="8" strokeLinecap="round" 
              strokeDasharray="464.96" strokeDashoffset={464.96 - (464.96 * 0.85)} style={{ transition: 'stroke-dashoffset 1s ease-out', filter: 'drop-shadow(0 0 6px rgba(45, 212, 191, 0.4))' }} />

            {/* Inner Ring Background (Progreso Semanal) */}
            <circle cx="100" cy="100" r="56" fill="none" stroke="rgba(251, 191, 36, 0.15)" strokeWidth="10" />
            {/* Inner Ring Progress (72%) */}
            <circle cx="100" cy="100" r="56" fill="none" stroke="#FBBF24" strokeWidth="10" strokeLinecap="round" 
              strokeDasharray="351.86" strokeDashoffset={351.86 - (351.86 * 0.72)} style={{ transition: 'stroke-dashoffset 1s ease-out', filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.5))' }} />
              
          </svg>

          {/* Inner Label (72%) */}
          <div className="outfit" style={{ 
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', fontWeight: 700, color: '#FBBF24', letterSpacing: '-0.02em',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
          }}>
            72<span style={{ fontSize: '16px', color: 'rgba(251, 191, 36, 0.7)', marginLeft: '2px' }}>%</span>
          </div>

          {/* Top Label */}
          <div style={{ position: 'absolute', top: '-12px', left: 0, right: 0, textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.05em' }}>
            PROGRESO SEMANAL
          </div>
          
          {/* Bottom Left Label */}
          <div style={{ position: 'absolute', bottom: '-4px', left: '-12px', textAlign: 'center', fontSize: '10px', color: '#2DD4BF', fontWeight: 700, lineHeight: 1.2 }}>
            85%)<br/><span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '8px', fontWeight: 600 }}>SALUD Y<br/>BIENESTAR</span>
          </div>
          
          {/* Bottom Right Label */}
          <div style={{ position: 'absolute', bottom: '-4px', right: '-16px', textAlign: 'center', fontSize: '10px', color: '#D97706', fontWeight: 700, lineHeight: 1.2 }}>
            (60%)<br/><span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '8px', fontWeight: 600 }}>APRENDIZAJE Y<br/>DESARROLLO</span>
          </div>

        </div>
      </div>

      </div>
    </div>
  );
};
