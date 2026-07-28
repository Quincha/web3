import React, { createContext, useContext, useState, useCallback } from 'react';
import gsap from 'gsap';

export type ViewState = 'login' | 'transition' | 'dashboard';

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
  }, []);

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
      duration: 0.3,
      onStart: () => {
        setTransitionMessage('Sincronizando configuración...');
        setProgress(45);
      }
    });

    // Step 3: Cargando módulos...
    tl.to({}, {
      duration: 0.3,
      delay: 0.1,
      onStart: () => {
        setTransitionMessage('Cargando módulos...');
        setProgress(75);
      }
    });

    // Step 4: Preparando Dashboard...
    tl.to({}, {
      duration: 0.3,
      delay: 0.1,
      onStart: () => {
        setTransitionMessage('Preparando Dashboard...');
        setProgress(100);
      }
    });

    // Final buffer delay to let the user see the completed load before transition
    tl.to({}, { duration: 0.2 });

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
