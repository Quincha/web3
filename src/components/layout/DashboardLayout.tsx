import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { DashboardSkeleton } from '../ui/SkeletonLoader';
import { DashboardHero } from '../dashboard/DashboardHero';
import { WidgetRegistry } from '../../widgets/WidgetRegistry';
import { FinanceSummaryBanner } from '../finance/dashboard/FinanceSummaryBanner';
import { useUser } from '../../context/UserContext';
import { Plus } from 'lucide-react';
import '../../Dashboard.css';

// Make sure all widgets are registered by importing them
import ActivityWidget from '../../widgets/ActivityWidget';
import TasksWidget from '../../widgets/TasksWidget';
import PomodoroWidget from '../../widgets/PomodoroWidget';
import { BujoWidget } from '../../widgets/BujoWidget';
import { HabitsWidget } from '../../widgets/HabitsWidget';
import { CalendarWidget } from '../../widgets/CalendarWidget';
import { PomodoroModule } from '../dashboard/PomodoroModule';
import { BujoModule } from '../dashboard/BujoModule';
import { HealthModule } from '../dashboard/HealthModule';
import { TasksModule } from '../dashboard/TasksModule';
import { HabitsModule } from '../dashboard/HabitsModule';
import { CalendarModule } from '../dashboard/CalendarModule';
import { DocumentsModule } from '../dashboard/DocumentsModule';
import { FinanceModule } from '../finance/FinanceModule';
import { ProjectsModule } from '../dashboard/ProjectsModule';
import { ActivityModule } from '../dashboard/ActivityModule';
import { ClientsModule } from '../dashboard/ClientsModule';
import { ShoppingModule } from '../dashboard/ShoppingModule';
import { StatisticsModule } from '../dashboard/StatisticsModule';
import { MessagesModule } from '../dashboard/MessagesModule';
import { AjustesModule } from '../dashboard/AjustesModule';
import { CommandPalette } from './CommandPalette';
import gsap from 'gsap';

import { useTransition } from '../../context/TransitionContext';

export const DashboardLayout: React.FC = () => {
  const { userConfig, updateConfig } = useUser();
  const { currentView: activeView, navigateTo } = useTransition();
  const [isLoading, setIsLoading] = useState(true);

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

    return (
      <div className="dashboard-content-area" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
          {/* Hero Section */}
          <div className="gsap-stagger-item">
            <DashboardHero />
          </div>

          {/* Classic 3x2 Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px'
          }}>
            {/* Row 1 */}
            <div className="gsap-stagger-item">
              <PomodoroWidget />
            </div>
            <div className="gsap-stagger-item">
              <TasksWidget />
            </div>
            <div className="gsap-stagger-item">
              <CalendarWidget />
            </div>

            {/* Row 2 */}
            <div className="gsap-stagger-item">
              <ActivityWidget />
            </div>
            <div className="gsap-stagger-item">
              <HabitsWidget />
            </div>
            <div className="gsap-stagger-item">
              <BujoWidget />
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
      <Sidebar activeView={activeView} onViewChange={navigateTo} />

      {/* Main Container Frame */}
      <div className="dashboard-main-frame" style={{ position: 'relative' }}>
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
           activeView === 'shopping' ? <ShoppingModule /> :
           activeView === 'proyectos' ? <ProjectsModule /> :
           activeView === 'actividad' ? <ActivityModule /> :
           activeView === 'clientes' ? <ClientsModule /> :
           activeView === 'estadisticas' ? <StatisticsModule /> :
           activeView === 'mensajes' ? <MessagesModule /> :
           activeView === 'ajustes' ? <AjustesModule /> :
           renderModulePlaceholder(activeView)}
        </main>
      </div>
    </div>
  );
};
