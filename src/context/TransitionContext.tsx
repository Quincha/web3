import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import gsap from 'gsap';

export type ViewState = string;

interface TransitionContextType {
  currentView: ViewState;
  transitionMessage: string;
  progress: number;
  startLoginTransition: (onComplete: () => void) => void;
  navigateTo: (view: ViewState) => void;
}

const TransitionContext = createContext<TransitionContextType | undefined>(undefined);

export const TransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewState>('login');
  const [transitionMessage, setTransitionMessage] = useState('');
  const [progress, setProgress] = useState(0);

  const navigateTo = useCallback((view: ViewState) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handleGlobalNav = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        navigateTo(customEvent.detail);
      }
    };
    window.addEventListener('change-view', handleGlobalNav);
    window.addEventListener('navigate-to-module', handleGlobalNav);
    return () => {
      window.removeEventListener('change-view', handleGlobalNav);
      window.removeEventListener('navigate-to-module', handleGlobalNav);
    };
  }, [navigateTo]);

  const startLoginTransition = useCallback((onComplete: () => void) => {
    setCurrentView('transition');
    setTransitionMessage('Verificando credenciales...');
    setProgress(15);

    // Create GSAP Timeline for the loader states
    const tl = gsap.timeline({
      onComplete: () => {
        setCurrentView('dashboard');
        onComplete();
      }
    });

    // Step 2: Sincronizando configuración...
    tl.to({}, {
      duration: 0.15,
      onStart: () => {
        setTransitionMessage('Sincronizando configuración...');
        setProgress(45);
      }
    });

    // Step 3: Cargando módulos...
    tl.to({}, {
      duration: 0.15,
      delay: 0.05,
      onStart: () => {
        setTransitionMessage('Cargando módulos...');
        setProgress(75);
      }
    });

    // Step 4: Preparando Dashboard...
    tl.to({}, {
      duration: 0.15,
      delay: 0.05,
      onStart: () => {
        setTransitionMessage('Preparando Dashboard...');
        setProgress(100);
      }
    });

    // Final buffer delay to let the user see the completed load before transition
    tl.to({}, { duration: 0.1 });

  }, []);

  return (
    <TransitionContext.Provider value={{ currentView, transitionMessage, progress, startLoginTransition, navigateTo }}>
      {children}
    </TransitionContext.Provider>
  );
};

export const useTransition = () => {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error('useTransition must be used within a TransitionProvider');
  }
  return context;
};
