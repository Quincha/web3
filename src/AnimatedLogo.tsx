import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import './AnimatedLogo.css';

export default function AnimatedLogo() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Set initial state for stroke animation and container position
      gsap.set(containerRef.current, { scale: 1.5, y: 100 });
      gsap.set('#ring', {
        strokeDasharray: 2500, strokeDashoffset: 2500,
        fill: 'url(#ringGrad)', fillOpacity: 0,
        stroke: '#FFFFFF', strokeWidth: 2,
        filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8))'
      });
      gsap.set('#tail', {
        strokeDasharray: 2500, strokeDashoffset: 2500,
        fill: 'url(#tailGrad)', fillOpacity: 0,
        stroke: '#FFFFFF', strokeWidth: 2,
        filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8))'
      });
      
      gsap.set('#glow', { opacity: 0 });

      // Draw the stroke
      tl.to(['#ring', '#tail'], {
        strokeDashoffset: 0,
        duration: 2,
        ease: 'power3.inOut',
        stagger: 0.2,
      })
      // Fade in the fill while stroke disappears
      .to(['#ring', '#tail'], {
        fillOpacity: 1,
        stroke: 'transparent',
        filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.25))',
        duration: 1,
        ease: 'power2.out',
      }, '-=0.5')
      // Fade in the glow
      .to('#glow', {
        opacity: 0.15,
        duration: 1,
      }, '-=0.5')
      // Shrink and move to final position
      .to(containerRef.current, {
        scale: 1,
        y: 0,
        duration: 1.2,
        ease: 'power3.inOut'
      }, '+=0.5');

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="logo-container" ref={containerRef}>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 1024 1024" 
        className="quincha-logo"
      >
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#D1D5DB" />
            <stop offset="100%" stopColor="#6B7280" />
          </linearGradient>
          <linearGradient id="tailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9CA3AF" />
            <stop offset="100%" stopColor="#4B5563" />
          </linearGradient>

          <mask id="rightGapMask">
            <rect width="100%" height="100%" fill="white" />
            <polygon points="447.6,500 959.6,900 984.6,900 472.6,500" fill="black" />
          </mask>
          
          <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="24" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* GLOW LAYER */}
        <g id="glow" filter="url(#subtleGlow)">
          <path d="M 512,172 A 300,340 0 1,1 511.9,172 Z M 512,212 A 200,300 0 1,0 512.1,212 Z" fill="var(--accent-green)" mask="url(#rightGapMask)" />
          <polygon points="450,580 550,580 934,880 834,880" fill="var(--accent-green)" />
        </g>

        {/* ARO PRINCIPAL */}
        <path id="ring" 
              d="M 512,172 A 300,340 0 1,1 511.9,172 Z M 512,212 A 200,300 0 1,0 512.1,212 Z" 
              mask="url(#rightGapMask)" />

        {/* COLA */}
        <polygon id="tail" 
                 points="450,580 550,580 934,880 834,880" />
      </svg>
      <div className="logo-text">
        <h1 className="logo-title">QUINCHA SYSTEMS</h1>
        <div className="logo-divider"></div>
        <p className="logo-subtitle">
          INGENIERÍA <span className="dot">•</span> SOFTWARE <span className="dot">•</span> AUTOMATIZACIÓN
        </p>
      </div>
    </div>
  );
}
