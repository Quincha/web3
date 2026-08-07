import React from 'react';
import { tokens } from '../../theme/tokens';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'lg',
  hoverEffect = true,
  className = '',
  style,
  ...props
}) => {
  const getPadding = () => {
    switch (padding) {
      case 'none': return '0';
      case 'sm': return tokens.spacing.space4;
      case 'md': return tokens.spacing.space6;
      case 'lg': return tokens.spacing.space8;
      default: return tokens.spacing.space8;
    }
  };

  const baseShadow = 'inset 0px 1px 1px rgba(255, 255, 255, 0.05), inset 0px -1px 2px rgba(0, 0, 0, 0.6), 0px 12px 32px rgba(0, 0, 0, 0.5), 0px 4px 12px rgba(0, 0, 0, 0.3)';
  // @ts-expect-error unused
  const hoverShadow = 'inset 0px 1px 2px rgba(255, 255, 255, 0.1), inset 0px -1px 4px rgba(0, 0, 0, 0.8), 0px 24px 48px rgba(0, 0, 0, 0.6), 0px 8px 24px rgba(0, 0, 0, 0.4)';

  const baseStyles: React.CSSProperties = {
    background: `linear-gradient(135deg, rgba(22, 30, 42, 0.85) 0%, rgba(12, 17, 24, 0.95) 100%)`,
    border: '1px solid rgba(255, 255, 255, 0.03)',
    borderRadius: tokens.radius.xl,
    padding: getPadding(),
    boxShadow: baseShadow,
    transition: `transform ${tokens.animations.durations.normal} ${tokens.animations.easings.easeOut}, box-shadow ${tokens.animations.durations.normal} ${tokens.animations.easings.easeOut}`,
    ...style,
  };

  return (
    <div
      style={baseStyles}
      className={`premium-card ${hoverEffect ? 'premium-card-hover' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
