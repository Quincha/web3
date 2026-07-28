import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useTransition } from '../../context/TransitionContext';
import { OfficialLogo } from '../ui/OfficialLogo';

export const TransitionManager: React.FC = () => {
  const { transitionMessage, progress } = useTransition();
  const logoRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Pulse animation on the Quincha Logo during transitions
    if (logoRef.current) {
      gsap.to(logoRef.current, {
        scale: 1.05,
        opacity: 0.8,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
      });
    }
  }, []);

  // Update progress bar width smooth with GSAP
  useEffect(() => {
    if (progressBarRef.current) {
      gsap.to(progressBarRef.current, {
        width: `${progress}%`,
        duration: 0.4,
        ease: 'power2.out'
      });
    }
  }, [progress]);

  return (
    <div ref={containerRef} className="premium-transition-overlay">
      <div className="transition-loader-card">
        {/* Animated Logo Icon */}
        <div ref={logoRef} className="transition-logo-circle" style={{ padding: '4px' }}>
          <OfficialLogo size={46} showGlow={true} />
        </div>

        {/* Message Indicator */}
        <div className="loader-status-container">
          <span className="loader-status-text">{transitionMessage}</span>
          <span className="loader-percentage">{progress}%</span>
        </div>

        {/* Progress Bar Container */}
        <div className="loader-progress-track">
          <div ref={progressBarRef} className="loader-progress-fill" style={{ width: '0%' }} />
        </div>
      </div>
    </div>
  );
};
