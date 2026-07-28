import React from 'react';
import { tokens } from '../../theme/tokens';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  fallback?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, size = 'md', fallback }) => {
  const getDimensions = () => {
    switch (size) {
      case 'sm': return '24px';
      case 'md': return '32px';
      case 'lg': return '48px';
      default: return '32px';
    }
  };

  const dim = getDimensions();

  const containerStyle: React.CSSProperties = {
    width: dim,
    height: dim,
    borderRadius: tokens.radius.pill,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: tokens.colors.background.hover,
    border: `1px solid ${tokens.colors.border.primary}`,
    flexShrink: 0,
  };

  if (src) {
    return (
      <div style={containerStyle}>
        <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <span style={{ 
        color: tokens.colors.text.secondary, 
        fontSize: size === 'sm' ? '10px' : size === 'md' ? '12px' : '16px',
        fontWeight: tokens.typography.weights.medium
      }}>
        {fallback || alt.charAt(0).toUpperCase()}
      </span>
    </div>
  );
};
