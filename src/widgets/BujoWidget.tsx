import React from 'react';
import { ExternalLink, Clock, Utensils, Rocket } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';
import { tokens } from '../theme/tokens';

export const BujoWidget: React.FC = () => {
  const logs = [
    { id: 1, time: '08:00', title: 'Inicio de jornada', color: tokens.colors.accent.green, icon: <Clock size={12} /> },
    { id: 2, time: '12:30', title: 'Almuerzo', color: tokens.colors.accent.cyan, icon: <Utensils size={12} /> },
    { id: 3, time: '18:30', title: 'Final de jornada', color: tokens.colors.accent.warning, icon: <Rocket size={12} /> },
  ];

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
        {logs.map((log, index) => (
          <div key={log.id} style={{ display: 'flex', gap: '16px', minHeight: '52px', position: 'relative' }}>
            {/* Timeline line */}
            {index < logs.length - 1 && (
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
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 500 }}>
                {log.time}
              </span>
            </div>
            
            {/* Dot and Content */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              {/* Icon Dot */}
              <div style={{ 
                width: '24px', 
                height: '24px', 
                borderRadius: '50%', 
                background: `linear-gradient(135deg, ${log.color}20, ${log.color}10)`, 
                border: `1px solid ${log.color}40`,
                color: log.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1
              }}>
                {log.icon}
              </div>
              
              {/* Title */}
              <div style={{ paddingTop: '2px' }}>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 500 }}>
                  {log.title}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
        <a href="#" style={{ color: tokens.colors.accent.green, fontSize: '12px', textDecoration: 'none', fontWeight: 500 }}>
          Abrir Bullet Journal ▾
        </a>
      </div>
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
