import React from 'react';
import { useUser } from '../../context/UserContext';
import { CheckCircle2, Calendar, DollarSign, CloudRain, Phone, Thermometer, ChevronRight, Sun, CloudSun, Cloud } from 'lucide-react';
import { tokens } from '../../theme/tokens';

export const DashboardHero: React.FC = () => {
  const { userConfig } = useUser();
  const firstName = userConfig.userName.split(' ')[0];

  const heroStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '24px',
    padding: '36px 40px',
    background: 'transparent',
    border: `1px solid rgba(255,255,255,0.05)`,
    boxShadow: tokens.shadows.elevation2,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginBottom: 0,
    minHeight: '260px',
    gap: '24px' // Adjusted for 4 columns
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
          
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={18} color="rgba(255,255,255,0.6)" />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>5</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Tareas</div>
            </div>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={18} color="rgba(255,255,255,0.6)" />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>2</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Reuniones</div>
            </div>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <DollarSign size={18} color={tokens.colors.accent.green} style={{ filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))'}} />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>1</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Cobro</div>
            </div>
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
      <div style={{ ...columnStyle, flex: '1', minWidth: '220px' }}>
        <div className="premium-card-hover" style={{ 
          background: 'rgba(15, 23, 42, 0.3)', 
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(56, 189, 248, 0.15)',
          borderRadius: '16px', 
          padding: '16px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.08em' }}>TIEMPO Y PRONÓSTICO</div>
            <ChevronRight size={14} color="rgba(255,255,255,0.4)" />
          </div>

          {/* Temp */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <Thermometer size={32} color={tokens.colors.accent.cyan} style={{ filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))'}} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>12°C</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Los Angeles</div>
            </div>
            <CloudRain size={24} color="rgba(255,255,255,0.6)" style={{ marginLeft: 'auto' }} />
          </div>

          {/* 5-Day Forecast Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(5, 1fr)', 
            gap: '8px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            padding: '12px 0',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            {/* Day 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{ fontSize: '9px', color: '#fff', fontWeight: 600 }}>Mar 29</div>
              <Sun size={16} color="#FBBF24" />
              <div style={{ fontSize: '9px', color: '#fff', fontWeight: 700 }}>18°<span style={{color: 'rgba(255,255,255,0.5)'}}>/8°C</span></div>
              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.5)' }}>Soleado</div>
            </div>
            
            {/* Day 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{ fontSize: '9px', color: '#fff', fontWeight: 600 }}>Mié 30</div>
              <CloudSun size={16} color="#FBBF24" />
              <div style={{ fontSize: '9px', color: '#fff', fontWeight: 700 }}>16°<span style={{color: 'rgba(255,255,255,0.5)'}}>/7°C</span></div>
              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.5)' }}>Parcial</div>
            </div>
            
            {/* Day 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{ fontSize: '9px', color: '#fff', fontWeight: 600 }}>Jue 31</div>
              <CloudRain size={16} color="#38BDF8" />
              <div style={{ fontSize: '9px', color: '#fff', fontWeight: 700 }}>14°<span style={{color: 'rgba(255,255,255,0.5)'}}>/6°C</span></div>
              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.5)' }}>Lluvia</div>
            </div>
            
            {/* Day 4 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{ fontSize: '9px', color: '#fff', fontWeight: 600 }}>Vie 1</div>
              <Cloud size={16} color="rgba(255,255,255,0.8)" />
              <div style={{ fontSize: '9px', color: '#fff', fontWeight: 700 }}>15°<span style={{color: 'rgba(255,255,255,0.5)'}}>/7°C</span></div>
              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.5)' }}>Cubierto</div>
            </div>
            
            {/* Day 5 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{ fontSize: '9px', color: '#fff', fontWeight: 600 }}>Sáb 2</div>
              <Sun size={16} color="#FBBF24" />
              <div style={{ fontSize: '9px', color: '#fff', fontWeight: 700 }}>19°<span style={{color: 'rgba(255,255,255,0.5)'}}>/10°C</span></div>
              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.5)' }}>Despejado</div>
            </div>
          </div>

          {/* AI Forecast Text Blocks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '8px 10px', fontSize: '9px', color: 'rgba(56, 189, 248, 0.8)', fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1.4 }}>
              ESTAMOS LIBRES DE LLUVIA HASTA LAS 16:30 APROX. (PROBABILIDAD: 10%)
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '8px 10px', fontSize: '9px', color: 'rgba(56, 189, 248, 0.8)', fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1.4 }}>
              SE AVECINA LLUVIA A LAS 18:00 APROX. (PROBABILIDAD: 80%)
            </div>
          </div>

        </div>
      </div>

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
  );
};
