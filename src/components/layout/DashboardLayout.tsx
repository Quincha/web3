import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DashboardSkeleton } from '../ui/SkeletonLoader';
import { DashboardHero } from '../dashboard/DashboardHero';
import { ProactiveAIAssistant } from '../dashboard/ProactiveAIAssistant';
import { PomodoroTasksWidget } from '../../widgets/PomodoroTasksWidget';
import { WidgetRegistry } from '../../widgets/WidgetRegistry';
import { FinanceSummaryBanner } from '../finance/dashboard/FinanceSummaryBanner';
import { useUser } from '../../context/UserContext';
import { Eye, Plus, Settings } from 'lucide-react';
import '../../Dashboard.css';

// Make sure all widgets are registered by importing them
import '../../widgets/StatsWidget';
import '../../widgets/ActivityWidget';
import '../../widgets/ProductivityWidget';
import '../../widgets/TasksWidget';
import '../../widgets/ProjectsWidget';
import '../../widgets/PomodoroWidget';
import '../../widgets/BujoWidget';
import '../../widgets/HealthWidget';
import '../../widgets/HabitsWidget';
import '../../widgets/ProactiveInsightsWidget';
import '../../widgets/CalendarWidget';
import { PomodoroModule } from '../dashboard/PomodoroModule';
import { BujoModule } from '../dashboard/BujoModule';
import { HealthModule } from '../dashboard/HealthModule';
import { TasksModule } from '../dashboard/TasksModule';
import { HabitsModule } from '../dashboard/HabitsModule';
import { CalendarModule } from '../dashboard/CalendarModule';
import { DocumentsModule } from '../dashboard/DocumentsModule';
import { FinanceModule } from '../finance/FinanceModule';
import { CommandPalette } from './CommandPalette';
import gsap from 'gsap';

export const DashboardLayout: React.FC = () => {
  const { userConfig, updateConfig } = useUser();
  const [activeView, setActiveView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [showConfigurator, setShowConfigurator] = useState(false);

  useEffect(() => {
    if (!isLoading && activeView === 'dashboard') {
      // Smooth GSAP Stagger animation for all main elements (Hero + Widgets + Footer)
      gsap.fromTo('.gsap-stagger-item', 
        { opacity: 0, y: 30, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.2)' }
      );
    }
  }, [isLoading, activeView]);

  useEffect(() => {
    const handleViewChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setActiveView(customEvent.detail);
    };
    window.addEventListener('change-view', handleViewChange);
    return () => window.removeEventListener('change-view', handleViewChange);
  }, []);

  useEffect(() => {
    // Simulate initial dashboard data loader skeleton
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [activeView]);

  const handleShowWidget = (id: string) => {
    const updated = userConfig.widgets.map(w => 
      w.id === id ? { ...w, visible: true } : w
    );
    updateConfig({ widgets: updated });
  };

  const hiddenWidgets = userConfig.widgets.filter(w => !w.visible);

  const renderDashboardHome = () => {
    if (isLoading) {
      return <DashboardSkeleton />;
    }

    // Sort widgets based on order
    const sortedWidgets = [...userConfig.widgets]
      .filter(w => w.visible)
      .sort((a, b) => a.order - b.order);

    return (
      <div className="dashboard-content-area" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
          {/* Hero Section */}
          <div className="gsap-stagger-item">
            <DashboardHero />
          </div>

          {/* Floating Customization Panel */}
          {showConfigurator && (
            <div className="widget-configurator-panel">
              <span className="panel-title">Ajustes de Widgets</span>
              {hiddenWidgets.length === 0 ? (
                <span className="panel-empty-text">Todos los widgets están visibles.</span>
              ) : (
                <div className="hidden-widgets-list">
                  {hiddenWidgets.map(w => {
                    const meta = WidgetRegistry.get(w.id);
                    return (
                      <div key={w.id} className="hidden-widget-row">
                        <span>{meta?.name || w.id}</span>
                        <button 
                          className="show-widget-btn"
                          onClick={() => handleShowWidget(w.id)}
                        >
                          <Plus size={14} />
                          <span>Mostrar</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Asymmetrical Bento Box Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '24px'
          }}>
            {/* Column 1: AI Assistant */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} className="gsap-stagger-item">
              <ProactiveAIAssistant />
            </div>

            {/* Column 2: Productivity (Pomodoro & Tasks + Habits) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
              <div className="gsap-stagger-item" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <PomodoroTasksWidget />
              </div>
              {userConfig.widgets.find(w => w.id === 'habitos')?.visible && (
                <div style={{ flex: 1 }} className="gsap-stagger-item">
                  {React.createElement(WidgetRegistry.get('habitos')?.component || 'div')}
                </div>
              )}
            </div>

            {/* Column 3: Time & Log (Calendar + Bujo) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
              {userConfig.widgets.find(w => w.id === 'calendario_widget')?.visible && (
                <div className="gsap-stagger-item">
                  {React.createElement(WidgetRegistry.get('calendario_widget')?.component || 'div')}
                </div>
              )}
              <div className="gsap-stagger-item" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {React.createElement(WidgetRegistry.get('bujo')?.component || 'div')}
              </div>
            </div>
          </div>
        </div>
        
        {/* Full-width sticky-style (but static) footer */}
        <div style={{ width: '100%', margin: '0 0 8px 0', flexShrink: 0 }} className="gsap-stagger-item">
          <FinanceSummaryBanner />
        </div>
      </div>
    );
  };

  const renderModulePlaceholder = (viewName: string) => {
    return (
      <div className="module-placeholder-view">
        <h2>Módulo: {viewName.toUpperCase()}</h2>
        <p>Esta vista se encuentra lista para conectar con el backend de Quincha Systems.</p>
        <div className="simulated-placeholder-card">
          <div className="placeholder-stripe" />
          <div className="placeholder-stripe" style={{ width: '60%' }} />
          <div className="placeholder-stripe" style={{ width: '80%' }} />
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-root-layout">
      {/* Cmd+K Panel overlay */}
      <CommandPalette />

      {/* Sidebar Frame */}
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      {/* Main Container Frame */}
      <div className="dashboard-main-frame" style={{ position: 'relative' }}>
        <Header />
        <main className="dashboard-body-scroller">
          {activeView === 'dashboard' ? renderDashboardHome() : 
           activeView === 'pomodoro' ? <PomodoroModule /> :
           activeView === 'bujo' ? <BujoModule /> :
           activeView === 'health' ? <HealthModule /> :
           activeView === 'tareas' ? <TasksModule /> :
           activeView === 'habitos' ? <HabitsModule /> :
           activeView === 'calendario' ? <CalendarModule /> :
           activeView === 'documentos' ? <DocumentsModule /> :
           activeView === 'finanzas' ? <FinanceModule /> :
           renderModulePlaceholder(activeView)}
        </main>
      </div>
    </div>
  );
};
