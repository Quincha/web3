import React from 'react';
import { useUser } from '../../context/UserContext';
import { Button } from '../ui/Button';
import { Play, Calendar as CalendarIcon } from 'lucide-react';
import { tokens } from '../../theme/tokens';
import { OfficialLogo } from '../ui/OfficialLogo';

export const DashboardHero: React.FC = () => {
  const { userConfig } = useUser();
  const firstName = userConfig.userName.split(' ')[0];

  const heroStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: tokens.radius.xxl,
    padding: `${tokens.spacing.space8} ${tokens.spacing.space12}`,
    background: 'linear-gradient(135deg, rgba(6, 8, 11, 0.95), rgba(9, 13, 17, 0.8))',
    border: `1px solid ${tokens.colors.border.primary}`,
    boxShadow: tokens.shadows.elevation2,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    minHeight: '240px',
  };

  const textContainerStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 2,
    maxWidth: '600px',
  };

  const backgroundGraphicsStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
    overflow: 'hidden',
    pointerEvents: 'none',
  };

  return (
    <div style={heroStyle}>
      {/* Background Graphics / Textures */}
      <div style={backgroundGraphicsStyle}>
        <img 
          src="/hero_aurora.png" 
          alt="Aurora and Mountains Background" 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.9,
          }} 
        />
        <div style={{
          position: 'absolute',
          right: '-5%',
          top: '-10%',
          opacity: 0.08,
          transform: 'scale(3.5)',
          zIndex: 1,
        }}>
          <OfficialLogo size={200} showGlow={true} />
        </div>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `linear-gradient(to right, rgba(6, 8, 11, 0.9) 0%, rgba(6, 8, 11, 0.2) 100%)`,
          zIndex: 2,
        }}></div>
      </div>

      <div style={textContainerStyle}>
        <h2 style={{
          fontFamily: tokens.typography.fonts.secondary,
          fontSize: tokens.typography.sizes.h2,
          color: tokens.colors.text.primary,
          fontWeight: tokens.typography.weights.regular,
          marginBottom: tokens.spacing.space2,
        }}>
          Buenos días,
        </h2>
        <h1 className="outfit" style={{
          fontSize: tokens.typography.sizes.display,
          fontWeight: tokens.typography.weights.bold,
          color: '#FFFFFF', // Pure white
          lineHeight: tokens.typography.lineHeights.tight,
          marginBottom: tokens.spacing.space4,
          letterSpacing: '-0.02em',
        }}>
          {firstName}<span style={{ color: tokens.colors.accent.green }}>.</span>
        </h1>
        <div style={{ display: 'flex', gap: tokens.spacing.space3, flexDirection: 'column', marginBottom: tokens.spacing.space8 }}>
          <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.sizes.title }}>
            Enfócate en lo que importa.
          </p>
          <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.sizes.title }}>
            Hoy es un gran día para avanzar.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.space6 }}>
          <Button variant="primary" size="lg" icon={<Play size={18} fill="currentColor" />} style={{ padding: '0 32px' }}>
            Continuar Pomodoro
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.space3, borderLeft: `1px solid ${tokens.colors.border.primary}`, paddingLeft: tokens.spacing.space6 }}>
            <div style={{ 
              background: 'rgba(0, 208, 132, 0.1)', 
              color: tokens.colors.accent.green, 
              padding: tokens.spacing.space2, 
              borderRadius: tokens.radius.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CalendarIcon size={20} />
            </div>
            <div>
              <p style={{ color: tokens.colors.text.primary, fontSize: tokens.typography.sizes.subtitle, fontWeight: tokens.typography.weights.medium }}>Próxima reunión</p>
              <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.sizes.small }}>14:30 - Revisión de proyecto</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
