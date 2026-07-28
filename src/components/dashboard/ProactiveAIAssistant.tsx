import React from 'react';
import { useUser } from '../../context/UserContext';
import { Sparkles, Check, AlertCircle, BookOpen, CreditCard } from 'lucide-react';
import { tokens } from '../../theme/tokens';
import { Button } from '../ui/Button';

export const ProactiveAIAssistant: React.FC = () => {
  const { userConfig } = useUser();
  const firstName = userConfig.userName.split(' ')[0];

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

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', zIndex: 1 }}>
        <Sparkles size={20} color={tokens.colors.accent.green} />
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: tokens.colors.accent.green, letterSpacing: '0.1em', margin: 0 }}>
          IA PROACTIVA
        </h3>
      </div>

      <h2 style={{ fontSize: '22px', fontWeight: 600, color: '#fff', marginBottom: '24px', lineHeight: 1.3, zIndex: 1, letterSpacing: '-0.01em' }}>
        {firstName}, hoy detecté:
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <AlertCircle size={18} color={tokens.colors.accent.warning} style={{ marginTop: '2px', flexShrink: 0 }} />
          <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>Tienes <strong>dos tareas bloqueadas</strong> en QuinchaDoro</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <BookOpen size={18} color={tokens.colors.accent.cyan} style={{ marginTop: '2px', flexShrink: 0 }} />
          <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>Llevas <strong>4 días sin leer</strong> tu libro actual</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <CreditCard size={18} color={tokens.colors.accent.danger} style={{ marginTop: '2px', flexShrink: 0 }} />
          <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>Mañana vence la <strong>factura de AWS</strong></span>
        </div>
      </div>

      <div style={{ marginTop: 'auto', zIndex: 1 }}>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
          ¿Quieres que reorganice tu día para resolver esto?
        </p>
        <Button 
          variant="primary" 
          icon={<Check size={16} />} 
          style={{ width: '100%', justifyContent: 'center', height: '48px', fontSize: '15px' }}
        >
          Sí, reorganizar mi día
        </Button>
      </div>
    </div>
  );
};
