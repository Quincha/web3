import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';
import { useUser } from '../context/UserContext';
import { useTasks } from '../context/TasksContext';
import { tokens } from '../theme/tokens';

const ProjectsWidget: React.FC = () => {
  const { hasPermission } = useUser();
  const { getActiveProjects, tasks } = useTasks();

  const allProjects = getActiveProjects();
  const displayProjects = allProjects.slice(0, 3); // Solo mostrar los últimos 3

  const projectStats = useMemo(() => {
    const stats: Record<string, { total: number, completed: number, progress: number }> = {};
    
    displayProjects.forEach(p => {
      const projectTasks = tasks.filter(t => t.project_id === p.id);
      const total = projectTasks.length;
      const completed = projectTasks.filter(t => t.status === 'completed').length;
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
      
      stats[p.id] = { total, completed, progress };
    });
    
    return stats;
  }, [displayProjects, tasks]);

  const canCreate = hasPermission('proyectos', 'create');

  return (
    <div className="projects-widget">
      <div className="widget-header-row">
        <h3>Proyectos Recientes</h3>
        <button className="text-btn">Ver todos los proyectos →</button>
      </div>

      <div className="projects-grid">
        {displayProjects.length === 0 ? (
           <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.4)', gridColumn: '1 / -1' }}>
             Sin proyectos activos
           </div>
        ) : (
          displayProjects.map((proj) => {
            const stats = projectStats[proj.id];
            
            return (
              <div key={proj.id} className="project-card">
                <div className="project-card-header">
                  <h4 className="project-title">{proj.name}</h4>
                  <span className="status-badge" style={{ background: `${proj.color || tokens.colors.accent.primary}20`, color: proj.color || tokens.colors.accent.primary }}>
                    Activo
                  </span>
                </div>
                <p className="project-desc" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {proj.description || 'Sin descripción'}
                </p>
                
                <div className="project-progress-container">
                  <div className="progress-bar-wrapper">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${stats?.progress || 0}%`, background: proj.color || tokens.colors.accent.primary }} 
                    />
                  </div>
                  <span className="progress-text">{stats?.progress || 0}%</span>
                </div>
              </div>
            );
          })
        )}

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
