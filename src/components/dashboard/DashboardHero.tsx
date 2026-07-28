import React from 'react';
import { useUser } from '../../context/UserContext';
import { Calendar as CalendarIcon, Briefcase, CheckCircle2, Clock, CloudRain, Lightbulb } from 'lucide-react';
import { tokens } from '../../theme/tokens';
import { OfficialLogo } from '../ui/OfficialLogo';
import { WeatherWidget } from './WeatherWidget';

interface MetricProps {
  title: string;
  value: string;
  trend: string;
  trendPositive: boolean;
  icon: React.ReactNode;
}

const HeroMetricCard: React.FC<MetricProps> = ({ title, value, trend, trendPositive, icon }) => {
  return (
    <div className="premium-card-hover" style={{ 
      background: 'rgba(6, 8, 11, 0.4)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.space5,
      display: 'flex', 
      gap: tokens.spacing.space4, 
      alignItems: 'flex-start',
      minWidth: 0,
      flex: 1,
      maxWidth: '240px',
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: '42px',
        height: '42px',
        borderRadius: tokens.radius.md,
        background: 'rgba(255, 255, 255, 0.05)',
        color: tokens.colors.accent.green,
        border: `1px solid rgba(255, 255, 255, 0.1)`,
        flexShrink: 0
      }}>
        {icon}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <h3 style={{ 
          fontSize: tokens.typography.sizes.small, 
          color: 'rgba(255, 255, 255, 0.7)',
          fontWeight: tokens.typography.weights.medium,
          margin: 0
        }}>
          {title}
        </h3>
        
        <span className="outfit" style={{ 
          fontSize: '24px', 
          fontWeight: tokens.typography.weights.bold, 
          color: '#FFFFFF',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
        }}>
          {value}
        </span>
        
        <div style={{ 
          fontSize: '11px',
          color: trendPositive ? tokens.colors.accent.green : 'rgba(255,255,255,0.5)',
          fontWeight: tokens.typography.weights.medium,
          marginTop: '4px'
        }}>
          {trend}
        </div>
      </div>
    </div>
  );
};

export const DashboardHero: React.FC = () => {
  const { userConfig } = useUser();
  const firstName = userConfig.userName.split(' ')[0];

  const heroStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '24px',
    padding: '32px 48px',
    background: 'linear-gradient(135deg, rgba(6, 8, 11, 0.98), rgba(9, 13, 17, 0.85))',
    border: `1px solid rgba(255,255,255,0.05)`,
    boxShadow: tokens.shadows.elevation2,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    minHeight: '260px',
    gap: '24px'
  };

  const textContainerStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 2,
    flex: '1',
    maxWidth: '55%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  };

  const metricsContainerStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 2,
    flex: '1',
    maxWidth: '55%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '16px',
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

  return (
    <div style={heroStyle} className="dashboard-hero-responsive">
      {/* Background Graphics / Textures */}
      <div style={backgroundGraphicsStyle}>
        {/* Gradient Overlay for Text Readability */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `linear-gradient(to right, rgba(6, 8, 11, 0.95) 0%, rgba(6, 8, 11, 0.5) 50%, rgba(6, 8, 11, 0.1) 100%)`,
          zIndex: 2,
        }}></div>
      </div>

      <div style={textContainerStyle}>
        {/* Living Hero Context Info */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <WeatherWidget />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: '100px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <CalendarIcon size={14} color={tokens.colors.accent.green} />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>En 45 min: Sync Equipo</span>
          </div>
        </div>

        <h2 style={{
          fontFamily: tokens.typography.fonts.secondary,
          fontSize: '28px',
          color: 'rgba(255,255,255,0.9)',
          fontWeight: tokens.typography.weights.regular,
          marginBottom: tokens.spacing.space1,
        }}>
          Buenos días,
        </h2>
        <h1 className="outfit" style={{
          fontSize: '64px',
          fontWeight: tokens.typography.weights.bold,
          color: '#FFFFFF', // Pure white
          lineHeight: tokens.typography.lineHeights.tight,
          marginBottom: tokens.spacing.space6,
          letterSpacing: '-0.03em',
        }}>
          {firstName}<span style={{ color: tokens.colors.accent.green }}>.</span>
        </h1>
        
        {/* AI Suggestion */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '12px', 
          background: 'linear-gradient(90deg, rgba(0,208,132,0.1) 0%, rgba(255,255,255,0.02) 100%)',
          borderLeft: `2px solid ${tokens.colors.accent.green}`,
          padding: '12px 16px',
          borderRadius: '0 8px 8px 0',
          maxWidth: '90%'
        }}>
          <Lightbulb size={18} color={tokens.colors.accent.green} style={{ marginTop: '2px' }} />
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
            Hoy tienes 3 tareas críticas y un cobro pendiente de $980.000. Te sugiero iniciar con <strong>Diseñar landing page</strong>.
          </p>
        </div>
      </div>

      <div style={metricsContainerStyle} className="hero-metrics-grid">
        <HeroMetricCard 
          title="Proyectos Activos" 
          value="12" 
          trend="20% vs mes pasado" 
          trendPositive={true} 
          icon={<Briefcase size={20} />} 
        />
        <HeroMetricCard 
          title="Tareas Completas" 
          value="84%" 
          trend="12% vs mes pasado" 
          trendPositive={true} 
          icon={<CheckCircle2 size={20} />} 
        />
        <HeroMetricCard 
          title="Tiempo Enfocado" 
          value="32h" 
          trend="8% vs mes pasado" 
          trendPositive={true} 
          icon={<Clock size={20} />} 
        />
      </div>
    </div>
  );
};
