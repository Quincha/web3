import React from 'react';
import { Card } from '../ui/Card';
import { Briefcase, CheckCircle2, Clock, Users, MoreHorizontal, TrendingUp } from 'lucide-react';
import { tokens } from '../../theme/tokens';

interface MetricProps {
  title: string;
  value: string;
  trend: string;
  trendPositive: boolean;
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricProps> = ({ title, value, trend, trendPositive, icon }) => {
  return (
    <Card padding="md" style={{ 
      position: 'relative', 
      display: 'flex', 
      gap: tokens.spacing.space5, 
      alignItems: 'flex-start',
      background: `linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, ${tokens.colors.background.card} 100%)`
    }}>
      <button style={{ 
        position: 'absolute',
        top: tokens.spacing.space4,
        right: tokens.spacing.space4,
        background: 'transparent', 
        border: 'none', 
        color: tokens.colors.text.muted,
        cursor: 'pointer' 
      }}>
        <MoreHorizontal size={18} />
      </button>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: '48px',
        height: '48px',
        borderRadius: tokens.radius.md,
        background: 'linear-gradient(180deg, rgba(0, 208, 132, 0.15) 0%, rgba(0, 208, 132, 0.03) 100%)',
        color: tokens.colors.accent.green,
        border: `1px solid rgba(0, 208, 132, 0.15)`,
        flexShrink: 0
      }}>
        {icon}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '2px' }}>
        <h3 style={{ 
          fontSize: tokens.typography.sizes.body, 
          color: tokens.colors.text.secondary,
          fontWeight: tokens.typography.weights.medium,
          letterSpacing: '0.01em',
          margin: 0
        }}>
          {title}
        </h3>
        
        <span className="outfit" style={{ 
          fontSize: '28px', 
          fontWeight: tokens.typography.weights.bold, 
          color: tokens.colors.text.primary,
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
          marginBottom: '2px'
        }}>
          {value}
        </span>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: tokens.spacing.space2,
          fontSize: tokens.typography.sizes.small,
          color: trendPositive ? tokens.colors.accent.green : tokens.colors.text.secondary,
          fontWeight: tokens.typography.weights.medium
        }}>
          {trendPositive && <TrendingUp size={14} />}
          <span>{trend}</span>
        </div>
      </div>
    </Card>
  );
};

export const MetricsRow: React.FC = () => {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
      gap: '16px',
      marginBottom: tokens.spacing.space6 
    }}>
      <MetricCard 
        title="Proyectos Activos" 
        value="12" 
        trend="20% desde el mes pasado" 
        trendPositive={true} 
        icon={<Briefcase size={20} />} 
      />
      <MetricCard 
        title="Tareas Completadas" 
        value="84%" 
        trend="12% desde el mes pasado" 
        trendPositive={true} 
        icon={<CheckCircle2 size={20} />} 
      />
      <MetricCard 
        title="Tiempo Enfocado" 
        value="32h" 
        trend="8% desde el mes pasado" 
        trendPositive={true} 
        icon={<Clock size={20} />} 
      />
      <MetricCard 
        title="Miembros del Equipo" 
        value="8" 
        trend="+2 nuevos este mes" 
        trendPositive={true} 
        icon={<Users size={20} />} 
      />
    </div>
  );
};
