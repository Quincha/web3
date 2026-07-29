import React, { useState, useMemo } from 'react';
import { Users, Plus, Building2, Phone, Mail, FolderGit2, CheckSquare } from 'lucide-react';
import { useClients } from '../../context/ClientsContext';
import { useTasks } from '../../context/TasksContext';
import { ClientSidebar } from './ClientSidebar';
import { tokens } from '../../theme/tokens';
import { Card } from '../ui/Card';

export const ClientsModule: React.FC = () => {
  const { getActiveClients } = useClients();
  const { getActiveProjects, tasks } = useTasks();
  
  const clients = getActiveClients();
  const projects = getActiveProjects();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Historial del cliente seleccionado
  const clientHistory = useMemo(() => {
    if (!selectedClientId) return null;
    
    const clientProjects = projects.filter(p => p.client_id === selectedClientId);
    
    // Tareas del cliente (ya sean directas o a través de un proyecto del cliente)
    const clientTasks = tasks.filter(t => 
      t.client_id === selectedClientId || 
      (t.project_id && clientProjects.some(p => p.id === t.project_id))
    );

    const completedTasks = clientTasks.filter(t => t.status === 'completed').length;
    
    return {
      projects: clientProjects,
      tasks: clientTasks,
      totalProjects: clientProjects.length,
      totalTasks: clientTasks.length,
      completedTasks
    };
  }, [selectedClientId, projects, tasks]);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="module-container fade-in" style={{ padding: '32px', height: '100%', display: 'flex', gap: '32px' }}>
      
      {/* Columna Izquierda: Lista de Clientes */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', maxWidth: selectedClientId ? '400px' : '100%', transition: 'max-width 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users size={28} color={tokens.colors.accent.primary} />
              Mis Clientes
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0 0' }}>
              Directorio y CRM ligero
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
            }}
          >
            <Plus size={18} />
            Nuevo Cliente
          </button>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: selectedClientId ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '16px',
          overflowY: 'auto'
        }}>
          {clients.map(client => (
            <Card 
              key={client.id} 
              padding="md"
              onClick={() => setSelectedClientId(client.id)}
              style={{ 
                cursor: 'pointer', 
                borderLeft: `4px solid ${client.color}`,
                background: selectedClientId === client.id ? 'rgba(255,255,255,0.05)' : undefined,
                borderColor: selectedClientId === client.id ? client.color : undefined
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ color: 'white', fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>{client.name}</h3>
                  {client.company && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '4px' }}>
                      <Building2 size={14} /> {client.company}
                    </div>
                  )}
                </div>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: client.color }} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Columna Derecha: Historial (Solo visible si hay un cliente seleccionado) */}
      {selectedClientId && selectedClient && clientHistory && (
        <div style={{ flex: '2', display: 'flex', flexDirection: 'column', animation: 'fadeInRight 0.3s ease' }}>
          <Card padding="xl" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${selectedClient.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedClient.color, fontWeight: 700, fontSize: '20px' }}>
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <h2 style={{ color: 'white', fontSize: '24px', margin: 0 }}>{selectedClient.name}</h2>
                  <span style={{ color: selectedClient.color, fontSize: '14px', fontWeight: 600 }}>{selectedClient.company}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '24px', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                {selectedClient.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={16} /> {selectedClient.email}</div>}
                {selectedClient.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={16} /> {selectedClient.phone}</div>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                  <FolderGit2 size={20} /> Proyectos Activos
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: 'white' }}>{clientHistory.totalProjects}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                  <CheckSquare size={20} /> Tareas Completadas
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: 'white' }}>
                  {clientHistory.completedTasks} <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>/ {clientHistory.totalTasks}</span>
                </div>
              </div>
            </div>

            <h3 style={{ color: 'white', fontSize: '18px', marginBottom: '16px' }}>Historial de Proyectos</h3>
            {clientHistory.projects.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>No hay proyectos asociados a este cliente.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {clientHistory.projects.map(proj => (
                  <div key={proj.id} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ color: 'white', margin: '0 0 4px 0' }}>{proj.name}</h4>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Creado el {new Date(proj.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ padding: '4px 8px', borderRadius: '4px', background: `${proj.color}20`, color: proj.color, fontSize: '12px', fontWeight: 600 }}>
                      Activo
                    </div>
                  </div>
                ))}
              </div>
            )}
            
          </Card>
        </div>
      )}

      <ClientSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
};
