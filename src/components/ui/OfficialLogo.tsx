import React from 'react';

interface OfficialLogoProps {
  size?: number | string;
  className?: string;
  showGlow?: boolean;
}

export const OfficialLogo: React.FC<OfficialLogoProps> = ({ 
  size = 40, 
  className = '', 
  showGlow = false 
}) => {
  // We use unique IDs or just standard ones. 
  // Since it might be rendered multiple times or in different places, let's make sure gradient IDs are stable or unique.
  // Using standard IDs is fine if they are identical, but appending a random suffix prevents conflicts when multiple logos exist.
  const suffix = React.useId().replace(/:/g, '');
  const ringGradId = `ringGrad-${suffix}`;
  const tailGradId = `tailGrad-${suffix}`;
  const rightGapMaskId = `rightGapMask-${suffix}`;
  const subtleGlowId = `subtleGlow-${suffix}`;

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
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#3EFCDB" />
          <stop offset="100%" stopColor="#16F0B5" />
        </linearGradient>
        <linearGradient id={tailGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3EFCDB" />
          <stop offset="100%" stopColor="#16F0B5" />
        </linearGradient>

        <mask id={rightGapMaskId}>
          <rect width="100%" height="100%" fill="white" />
          <polygon points="447.6,500 959.6,900 984.6,900 472.6,500" fill="black" />
        </mask>
        
        <filter id={subtleGlowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="24" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* GLOW LAYER */}
      {showGlow && (
        <g filter={`url(#${subtleGlowId})`} style={{ opacity: 0.25 }}>
          <path 
            d="M 512,172 A 300,340 0 1,1 511.9,172 Z M 512,212 A 200,300 0 1,0 512.1,212 Z" 
            fill="#FFFFFF" 
            mask={`url(#${rightGapMaskId})`} 
          />
          <polygon 
            points="450,580 550,580 934,880 834,880" 
            fill="#FFFFFF" 
          />
        </g>
      )}

      {/* ARO PRINCIPAL */}
      <path 
        d="M 512,172 A 300,340 0 1,1 511.9,172 Z M 512,212 A 200,300 0 1,0 512.1,212 Z" 
        fill={`url(#${ringGradId})`}
        mask={`url(#${rightGapMaskId})`} 
      />

      {/* COLA */}
      <polygon 
        points="450,580 550,580 934,880 834,880" 
        fill={`url(#${tailGradId})`}
      />
    </svg>
  );
};
