import React from 'react';
import { Plus } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';
import { useUser } from '../context/UserContext';

const ProjectsWidget: React.FC = () => {
  const { hasPermission } = useUser();

  const projects = [
    {
      title: 'QuinchaDoro Platform',
      status: 'En progreso',
      statusClass: 'in-progress',
      desc: 'Plataforma multiplataforma para gestión de tareas y hábitos',
      progress: 75,
      avatars: [
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&fit=crop',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&fit=crop',
        'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=80&fit=crop',
      ],
      extraMembers: 3,
    },
    {
      title: 'EcoVertical System',
      status: 'En desarrollo',
      statusClass: 'development',
      desc: 'Sistema de cultivo vertical automatizado con IA',
      progress: 60,
      avatars: [
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&fit=crop',
        'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=80&fit=crop',
      ],
      extraMembers: 2,
    },
    {
      title: 'Galtec Web',
      status: 'En revisión',
      statusClass: 'review',
      desc: 'Sitio web corporativo para Constructora GALTEC',
      progress: 90,
      avatars: [
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&fit=crop',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&fit=crop',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop',
      ],
      extraMembers: 1,
    },
  ];

  const handleCreateProject = () => {
    if (!hasPermission('proyectos', 'create')) {
      alert('Error: No tienes permiso para crear proyectos con tu rol actual.');
      return;
    }
    alert('Acción permitida: Abriendo creador de proyectos...');
  };

  const canCreate = hasPermission('proyectos', 'create');

  return (
    <div className="projects-widget">
      <div className="widget-header-row">
        <h3>Proyectos Recientes</h3>
        <button className="text-btn">Ver todos los proyectos →</button>
      </div>

      <div className="projects-grid">
        {projects.map((proj, i) => (
          <div key={i} className="project-card">
            <div className="project-card-header">
              <h4 className="project-title">{proj.title}</h4>
              <span className={`status-badge status-${proj.statusClass}`}>
                {proj.status}
              </span>
            </div>
            <p className="project-desc">{proj.desc}</p>
            
            <div className="project-progress-container">
              <div className="progress-bar-wrapper">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${proj.progress}%` }} 
                />
              </div>
              <span className="progress-text">{proj.progress}%</span>
            </div>

            <div className="project-footer">
              <div className="member-avatars">
                {proj.avatars.map((url, index) => (
                  <img key={index} src={url} alt="member" className="member-avatar" />
                ))}
                {proj.extraMembers > 0 && (
                  <div className="avatar-extra">+{proj.extraMembers}</div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* New Project creation card - conditional check demo */}
        <div 
          className={`project-card new-project-card ${!canCreate ? 'disabled-card' : ''}`}
          onClick={handleCreateProject}
        >
          <div className="new-project-content">
            <div className="plus-icon-circle">
              <Plus size={20} />
            </div>
            <span className="new-project-text">Nuevo Proyecto</span>
            {!canCreate && <span className="permission-lock">Sin permisos</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

WidgetRegistry.register({
  id: 'projects',
  name: 'Proyectos Recientes',
  description: 'Listado de proyectos activos con barra de progreso y colaboradores.',
  defaultSize: 'large',
  component: ProjectsWidget,
});

export default ProjectsWidget;
