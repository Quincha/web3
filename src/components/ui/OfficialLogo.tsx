import React from 'react';

interface OfficialLogoProps {
  size?: number | string;
  className?: string;
  showGlow?: boolean;
  variant?: 'default' | 'white';
}

export const OfficialLogo: React.FC<OfficialLogoProps> = ({ 
  size = 40, 
  className = '', 
  showGlow = false,
  variant = 'default'
}) => {
  const suffix = React.useId().replace(/:/g, '');
  const ringGradId = `ringGrad-${suffix}`;
  const tailGradId = `tailGrad-${suffix}`;
  const rightGapMaskId = `rightGapMask-${suffix}`;
  const subtleGlowId = `subtleGlow-${suffix}`;

  const isWhite = variant === 'white';

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 1024 1024" 
      width={size} 
      height={size}
      className={`official-q-logo ${className}`}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={ringGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isWhite ? "#FFFFFF" : "#FFFFFF"} />
          <stop offset="50%" stopColor={isWhite ? "#E2E8F0" : "#3EFCDB"} />
          <stop offset="100%" stopColor={isWhite ? "#94A3B8" : "#16F0B5"} />
        </linearGradient>
        <linearGradient id={tailGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isWhite ? "#E2E8F0" : "#3EFCDB"} />
          <stop offset="100%" stopColor={isWhite ? "#94A3B8" : "#16F0B5"} />
        </linearGradient>

        <mask id={rightGapMaskId}>
          <rect width="100%" height="100%" fill="white" />
          <polygon points="447.6,500 959.6,900 984.6,900 472.6,500" fill="black" />
        </mask>
        
        <filter id={subtleGlowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="32" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* GLOW LAYER */}
      {showGlow && (
        <g filter={`url(#${subtleGlowId})`} style={{ opacity: isWhite ? 0.3 : 0.75 }}>
          <path 
            d="M 512,140 A 340,360 0 1,1 511.9,140 Z M 512,250 A 180,240 0 1,0 512.1,250 Z" 
            fill="#FFFFFF" 
            mask={`url(#${rightGapMaskId})`} 
          />
          <polygon 
            points="420,540 580,540 984,880 824,880" 
            fill="#FFFFFF" 
          />
        </g>
      )}

      {/* ARO PRINCIPAL (Thicker by reducing inner hole size and expanding outer) */}
      <path 
        d="M 512,140 A 340,360 0 1,1 511.9,140 Z M 512,250 A 180,240 0 1,0 512.1,250 Z" 
        fill={`url(#${ringGradId})`}
        mask={`url(#${rightGapMaskId})`} 
      />

      {/* COLA (Thicker to match ring) */}
      <polygon 
        points="420,540 580,540 984,880 824,880" 
        fill={`url(#${tailGradId})`}
      />
    </svg>
  );
};
