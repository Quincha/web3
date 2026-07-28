import React from 'react';
import { tokens } from '../../theme/tokens';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  className = '',
  style,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: `linear-gradient(180deg, ${tokens.colors.accent.bright} 0%, ${tokens.colors.accent.green} 100%)`,
          color: tokens.colors.background.primary,
          boxShadow: `inset 0 2px 4px rgba(255, 255, 255, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.2), 0 8px 24px ${tokens.colors.glow.green}`,
          border: '1px solid rgba(255, 255, 255, 0.2)',
        };
      case 'secondary':
        return {
          background: 'transparent',
          color: tokens.colors.accent.green,
          border: `1px solid ${tokens.colors.accent.green}`,
          boxShadow: `0 4px 12px ${tokens.colors.glow.greenSubtle}`,
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: tokens.colors.text.secondary,
          border: 'none',
        };
      case 'icon':
        return {
          background: 'transparent',
          color: tokens.colors.text.secondary,
          border: 'none',
          padding: tokens.spacing.space2,
        };
      default:
        return {};
    }
  };

  const getSizeStyles = () => {
    if (variant === 'icon') return { width: '32px', height: '32px' };
    switch (size) {
      case 'sm':
        return { padding: `${tokens.spacing.space2} ${tokens.spacing.space4}`, fontSize: tokens.typography.sizes.small, height: '32px' };
      case 'md':
        return { padding: `${tokens.spacing.space3} ${tokens.spacing.space6}`, fontSize: tokens.typography.sizes.body, height: '46px' };
      case 'lg':
        return { padding: `${tokens.spacing.space4} ${tokens.spacing.space8}`, fontSize: tokens.typography.sizes.title, height: '56px' };
      default:
        return {};
    }
  };

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.space2,
    borderRadius: tokens.radius.pill,
    fontWeight: tokens.typography.weights.semibold,
    cursor: 'pointer',
    transition: `all ${tokens.animations.durations.fast} ${tokens.animations.easings.easeOut}`,
    width: fullWidth ? '100%' : 'auto',
    fontFamily: tokens.typography.fonts.secondary,
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  return (
    <button 
      style={baseStyles}
      className={`premium-btn ${className}`}
      onMouseEnter={(e) => {
        if (variant === 'primary' && !props.disabled) {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = `inset 0 2px 6px rgba(255, 255, 255, 0.7), inset 0 -2px 4px rgba(0, 0, 0, 0.2), 0 12px 32px ${tokens.colors.glow.green}`;
        }
        if (variant === 'ghost' && !props.disabled) {
          e.currentTarget.style.color = tokens.colors.text.primary;
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'primary' && !props.disabled) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = `inset 0 2px 4px rgba(255, 255, 255, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.2), 0 8px 24px ${tokens.colors.glow.green}`;
        }
        if (variant === 'ghost' && !props.disabled) {
          e.currentTarget.style.color = tokens.colors.text.secondary;
        }
      }}
      {...props}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
};
