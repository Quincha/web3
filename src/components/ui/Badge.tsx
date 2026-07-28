import React from 'react';
import { tokens } from '../../theme/tokens';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', icon }) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { color: tokens.colors.accent.green, bg: 'rgba(0, 208, 132, 0.1)' };
      case 'warning':
        return { color: tokens.colors.accent.warning, bg: 'rgba(255, 184, 77, 0.1)' };
      case 'danger':
        return { color: tokens.colors.accent.danger, bg: 'rgba(255, 95, 115, 0.1)' };
      case 'info':
        return { color: tokens.colors.accent.cyan, bg: 'rgba(58, 205, 255, 0.1)' };
      case 'default':
      default:
        return { color: tokens.colors.text.secondary, bg: tokens.colors.background.hover };
    }
  };

  const { color, bg } = getColors();

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: tokens.radius.pill,
      backgroundColor: bg,
      color: color,
      fontSize: tokens.typography.sizes.caption,
      fontWeight: tokens.typography.weights.medium,
      border: `1px solid ${color}20` // 20 is hex for roughly 12% opacity
    }}>
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </span>
  );
};
