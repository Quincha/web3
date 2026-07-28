import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DashboardSkeleton } from '../ui/SkeletonLoader';
import { WidgetContainer } from '../dashboard/WidgetContainer';
import { DashboardHero } from '../dashboard/DashboardHero';
import { MetricsRow } from '../dashboard/MetricsRow';
import { WidgetRegistry } from '../../widgets/WidgetRegistry';
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
      // Smooth GSAP Stagger animation for widgets
      gsap.fromTo('.dashboard-widget-wrapper-card', 
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out', delay: 0.1 }
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
      <div className="dashboard-content-area">
        {/* Dashboard Hero */}
        <DashboardHero />
        
        {/* Metrics Row */}
        <MetricsRow />

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

        {/* Widget Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          paddingBottom: '40px'
        }}>
          {/* Row 1 */}
          <WidgetContainer config={{ id: 'pomodoro', visible: true, order: 0, size: 'medium' }} name="Pomodoro">
            {React.createElement(WidgetRegistry.get('pomodoro')?.component || 'div')}
          </WidgetContainer>
          <WidgetContainer config={{ id: 'tareas', visible: true, order: 1, size: 'medium' }} name="Tareas">
            {React.createElement(WidgetRegistry.get('tareas')?.component || 'div')}
          </WidgetContainer>
          <WidgetContainer config={{ id: 'calendario_widget', visible: true, order: 2, size: 'medium' }} name="Calendario">
            {React.createElement(WidgetRegistry.get('calendario_widget')?.component || 'div')}
          </WidgetContainer>

          {/* Row 2 */}
          <WidgetContainer config={{ id: 'activity', visible: true, order: 3, size: 'medium' }} name="Actividad Reciente">
            {React.createElement(WidgetRegistry.get('activity')?.component || 'div')}
          </WidgetContainer>
          <WidgetContainer config={{ id: 'habitos', visible: true, order: 4, size: 'medium' }} name="Hábitos">
            {React.createElement(WidgetRegistry.get('habitos')?.component || 'div')}
          </WidgetContainer>
          <WidgetContainer config={{ id: 'bujo', visible: true, order: 5, size: 'medium' }} name="Bullet Journal">
            {React.createElement(WidgetRegistry.get('bujo')?.component || 'div')}
          </WidgetContainer>
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
      <div className="dashboard-main-frame">
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
