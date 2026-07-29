import React from 'react';
import GridBackground from './GridBackground';
import AnimatedLogo from './AnimatedLogo';
import LoginForm from './LoginForm';
import Footer from './Footer';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './context/UserContext';
import { TransitionProvider, useTransition } from './context/TransitionContext';
import { PomodoroProvider } from './context/PomodoroContext';
import { BujoProvider } from './context/BujoContext';
import { HealthProvider } from './context/HealthContext';
import { TasksProvider } from './context/TasksContext';
import { HabitsProvider } from './context/HabitsContext';
import { TransitionManager } from './components/layout/TransitionManager';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ClientPortal } from './components/portal/ClientPortal';
import { InsightsProvider } from './context/InsightsContext';
import { FinanceProvider } from './context/FinanceContext';
import { ClientsProvider } from './context/ClientsContext';

function MainAppContent() {
  const { currentView } = useTransition();

  if (currentView === 'transition') {
    return <TransitionManager />;
  }

  if (currentView === 'dashboard') {
    return <DashboardLayout />;
  }

  return (
    <>
      <GridBackground />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        position: 'relative'
      }}>
        <AnimatedLogo />
        <LoginForm />
        <Footer />
      </div>
    </>
  );
}

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const isClientPortal = urlParams.get('mode') === 'client';

  if (isClientPortal) {
    return (
      <ThemeProvider>
        <ClientPortal />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <UserProvider>
        <TransitionProvider>
          <TasksProvider>
            <HabitsProvider>
              <PomodoroProvider>
                <BujoProvider>
                  <HealthProvider>
                    <FinanceProvider>
                      <InsightsProvider>
                        <ClientsProvider>
                          <MainAppContent />
                        </ClientsProvider>
                      </InsightsProvider>
                    </FinanceProvider>
                  </HealthProvider>
                </BujoProvider>
              </PomodoroProvider>
            </HabitsProvider>
          </TasksProvider>
        </TransitionProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
