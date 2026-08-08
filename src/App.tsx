import { useRef, useEffect } from 'react';
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
import { BandProvider } from './context/BandContext';
import { TasksProvider } from './context/TasksContext';
import { HabitsProvider } from './context/HabitsContext';
import { GoalsProvider } from './context/GoalsContext';
import { TransitionManager } from './components/layout/TransitionManager';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ClientPortal } from './components/portal/ClientPortal';
import { InsightsProvider } from './context/InsightsContext';
import { FinanceProvider } from './context/FinanceContext';
import { ClientsProvider } from './context/ClientsContext';
import { ShoppingProvider } from './context/ShoppingContext';
import { MessagesProvider } from './context/MessagesContext';
import { GlobalTaskCompletionModal } from './components/dashboard/GlobalTaskCompletionModal';
import { Api } from './services/ApiClient';

function MainAppContent() {
  const { currentView } = useTransition();

  if (currentView === 'transition') {
    return <TransitionManager />;
  }

  if (currentView !== 'login') {
    return (
      <>
        <DashboardLayout />
        <GlobalTaskCompletionModal />
      </>
    );
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
                  <GoalsProvider>
                    <HealthProvider>
                      <BandProvider>
                        <FinanceProvider>
                        <InsightsProvider>
                          <ClientsProvider>
                            <ShoppingProvider>
                              <MessagesProvider>
                                <SessionRestore />
                              </MessagesProvider>
                            </ShoppingProvider>
                          </ClientsProvider>
                        </InsightsProvider>
                      </FinanceProvider>
                      </BandProvider>
                    </HealthProvider>
                  </GoalsProvider>
                </BujoProvider>
              </PomodoroProvider>
            </HabitsProvider>
          </TasksProvider>
        </TransitionProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

// Restore a persisted session on first load (skip login if a valid token exists).
function SessionRestore() {
  const { navigateTo, currentView } = useTransition();
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (currentView !== 'login') return;

    if (Api.isAuthenticated()) {
      Api.me()
        .then(() => {
          window.dispatchEvent(new Event('quincha-auth'));
          navigateTo('dashboard');
        })
        .catch(() => { /* invalid token: stay on login */ });
    }
  }, [currentView, navigateTo]);

  return <MainAppContent />;
}

export default App;
