import React from 'react';
import { Folder, CheckCircle, Clock, Users, ArrowUpRight } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';

const StatsWidget: React.FC = () => {
  const stats = [
    {
      title: 'Proyectos Activos',
      value: '12',
      change: '+20% desde el mes pasado',
      icon: <Folder size={20} />,
      isPositive: true,
    },
    {
      title: 'Tareas Completadas',
      value: '84%',
      change: '+12% desde el mes pasado',
      icon: <CheckCircle size={20} />,
      isPositive: true,
    },
    {
      title: 'Tiempo Enfocado',
      value: '32h',
      change: '+8% desde el mes pasado',
      icon: <Clock size={20} />,
      isPositive: true,
    },
    {
      title: 'Miembros del Equipo',
      value: '8',
      change: '+2 nuevos este mes',
      icon: <Users size={20} />,
      isPositive: true,
    },
  ];

  return (
    <div className="stats-widget-grid">
      {stats.map((stat, i) => (
        <div key={i} className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper">{stat.icon}</div>
            <div className="stat-trend">
              <ArrowUpRight size={14} className="trend-arrow" />
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-title">{stat.title}</span>
            <span className="stat-value">{stat.value}</span>
            <span className="stat-change">{stat.change}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Register widget
WidgetRegistry.register({
  id: 'stats',
  name: 'Métricas Clave',
  description: 'Muestra estadísticas generales sobre proyectos, tareas y tiempo.',
  defaultSize: 'large',
  component: StatsWidget,
});

export default StatsWidget;
