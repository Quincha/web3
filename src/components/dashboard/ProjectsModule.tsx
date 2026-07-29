import React, { useState, useMemo } from 'react';
import { Briefcase, Plus, FolderGit2, Calendar, Target, ChevronRight } from 'lucide-react';
import { useTasks } from '../../context/TasksContext';
import { ProjectSidebar } from './ProjectSidebar';
import { tokens } from '../../theme/tokens';
import { Card } from '../ui/Card';

export const ProjectsModule: React.FC = () => {
  const { getActiveProjects, tasks } = useTasks();
  const projects = getActiveProjects();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Calcula el progreso de cada proyecto (tareas completadas vs total de tareas del proyecto)
  const projectStats = useMemo(() => {
    const stats: Record<string, { total: number, completed: number, progress: number }> = {};
    
    projects.forEach(p => {
      const projectTasks = tasks.filter(t => t.project_id === p.id);
      const total = projectTasks.length;
      const completed = projectTasks.filter(t => t.status === 'completed').length;
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
      
      stats[p.id] = { total, completed, progress };
    });
    
    return stats;
  }, [projects, tasks]);

  return (
    <div className="module-container fade-in" style={{ padding: '32px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Briefcase size={28} color={tokens.colors.accent.primary} />
            Mis Proyectos
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0 0' }}>
            Gestiona tus portafolios y visualiza el avance global
          </p>
        </div>
        
        <button 
          onClick={() => setIsSidebarOpen(true)}
          style={{
            background: tokens.colors.accent.primary,
            color: '#000',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: `0 4px 20px ${tokens.colors.accent.primary}40`,
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Plus size={18} />
          Nuevo Proyecto
        </button>
      </div>

      {/* Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
        gap: '24px',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '8px',
        paddingBottom: '40px'
      }}>
        {projects.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <FolderGit2 size={48} color="rgba(255,255,255,0.2)" style={{ marginBottom: '16px' }} />
            <h3 style={{ color: 'white', fontSize: '18px', margin: '0 0 8px 0' }}>Ningún proyecto activo</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Crea tu primer proyecto para empezar a organizar tus tareas.</p>
          </div>
        ) : (
          projects.map(proj => {
            const stats = projectStats[proj.id] || { total: 0, completed: 0, progress: 0 };
            
            return (
              <Card key={proj.id} padding="lg" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '20px',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 600, margin: 0 }}>{proj.name}</h3>
                    <div style={{ 
                      background: `${proj.color || tokens.colors.accent.primary}20`, 
                      color: proj.color || tokens.colors.accent.primary,
                      padding: '4px 8px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      Activo
                    </div>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {proj.description || 'Sin descripción'}
                  </p>
                </div>

                {/* Meta stats */}
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                    <Target size={14} />
                    <span>{stats.total} tareas</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                    <Calendar size={14} />
                    <span>{new Date(proj.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Progreso global</span>
                    <span style={{ fontSize: '12px', color: proj.color || tokens.colors.accent.primary, fontWeight: 600 }}>{stats.progress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${stats.progress}%`, 
                      height: '100%', 
                      background: proj.color || tokens.colors.accent.primary,
                      transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} />
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <ProjectSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
};
