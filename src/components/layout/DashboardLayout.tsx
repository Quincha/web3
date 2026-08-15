import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Sidebar } from './Sidebar';
import { DashboardSkeleton } from '../ui/SkeletonLoader';
import { DashboardHero } from '../dashboard/DashboardHero';
import { FinanceSummaryBanner } from '../finance/dashboard/FinanceSummaryBanner';
import '../../Dashboard.css';

// Make sure all widgets are registered by importing them
import ActivityWidget from '../../widgets/ActivityWidget';
import TasksWidget from '../../widgets/TasksWidget';
import PomodoroWidget from '../../widgets/PomodoroWidget';
import { BujoWidget } from '../../widgets/BujoWidget';
import { HabitsWidget } from '../../widgets/HabitsWidget';
import { CalendarWidget } from '../../widgets/CalendarWidget';
const PomodoroModule = lazy(() => import('../dashboard/PomodoroModule').then(m => ({ default: m.PomodoroModule })));
const BujoModule = lazy(() => import('../dashboard/BujoModule').then(m => ({ default: m.BujoModule })));
const HealthModule = lazy(() => import('../dashboard/HealthModule').then(m => ({ default: m.HealthModule })));
const TasksModule = lazy(() => import('../dashboard/TasksModule').then(m => ({ default: m.TasksModule })));
const HabitsModule = lazy(() => import('../dashboard/HabitsModule').then(m => ({ default: m.HabitsModule })));
const CalendarModule = lazy(() => import('../dashboard/CalendarModule').then(m => ({ default: m.CalendarModule })));
const DocumentsModule = lazy(() => import('../dashboard/DocumentsModule').then(m => ({ default: m.DocumentsModule })));
const FinanceModule = lazy(() => import('../finance/FinanceModule').then(m => ({ default: m.FinanceModule })));
const ProjectsModule = lazy(() => import('../dashboard/ProjectsModule').then(m => ({ default: m.ProjectsModule })));
const ActivityModule = lazy(() => import('../dashboard/ActivityModule').then(m => ({ default: m.ActivityModule })));
const ClientsModule = lazy(() => import('../dashboard/ClientsModule').then(m => ({ default: m.ClientsModule })));
const ShoppingModule = lazy(() => import('../dashboard/ShoppingModule').then(m => ({ default: m.ShoppingModule })));
const StatisticsModule = lazy(() => import('../dashboard/StatisticsModule').then(m => ({ default: m.StatisticsModule })));
const MessagesModule = lazy(() => import('../dashboard/MessagesModule').then(m => ({ default: m.MessagesModule })));
const AjustesModule = lazy(() => import('../dashboard/AjustesModule').then(m => ({ default: m.AjustesModule })));
const BandModule = lazy(() => import('../dashboard/BandModule').then(m => ({ default: m.BandModule })));
const RegistroModule = lazy(() => import('../dashboard/RegistroModule').then(m => ({ default: m.RegistroModule })));
import { CommandPalette } from './CommandPalette';
import gsap from 'gsap';

import { useTransition } from '../../context/TransitionContext';

export const DashboardLayout: React.FC = () => {
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
          <div className="dashboard-main-grid">
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
          <Suspense fallback={<DashboardSkeleton />}>
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
             activeView === 'band' ? <BandModule /> :
             activeView === 'registro' ? <RegistroModule /> :
             renderModulePlaceholder(activeView)}
          </Suspense>
        </main>
      </div>
    </div>
  );
};
