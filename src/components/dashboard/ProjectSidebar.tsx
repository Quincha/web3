import React, { useState } from 'react';
import { X, Save, Palette, Building2 } from 'lucide-react';
import { useTasks } from '../../context/TasksContext';
import { useClients } from '../../context/ClientsContext';
import { tokens } from '../../theme/tokens';

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ isOpen, onClose }) => {
  const { addProject } = useTasks();
  const { getActiveClients } = useClients();
  const clients = getActiveClients();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [clientId, setClientId] = useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setColor(PRESET_COLORS[0]);
      setClientId('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addProject({
      name: name.trim(),
      description: description.trim(),
      color,
      client_id: clientId || null,
      archived: false,
    });

    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          animation: 'fadeIn 0.2s ease'
        }}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px',
          background: 'linear-gradient(145deg, rgba(16, 24, 39, 0.98) 0%, rgba(6, 8, 11, 1) 100%)',
          borderLeft: `1px solid ${color}40`,
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          zIndex: 1000,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', margin: 0 }}>
            Nuevo Proyecto
          </h2>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Nombre del Proyecto</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Rediseño App iOS"
              required
              style={{ 
                width: '100%', 
                background: 'rgba(0,0,0,0.2)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                padding: '12px 16px',
                color: 'white',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box'
              }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Descripción (Opcional)</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Objetivos, alcance o notas principales..."
              rows={3}
              style={{ 
                width: '100%', 
                background: 'rgba(0,0,0,0.2)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                padding: '12px 16px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'none'
              }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={14} /> Cliente (Opcional)
            </label>
            <select 
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              style={{ 
                width: '100%', 
                background: 'rgba(0,0,0,0.2)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                padding: '12px 16px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }} 
            >
              <option value="">Ninguno</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Palette size={14} /> Color de Identificación
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: color === c ? `2px solid white` : '2px solid transparent',
                    outline: color === c ? `2px solid ${c}` : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    padding: 0
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
            <button 
              type="submit"
              style={{
                width: '100%',
                background: color,
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: `0 4px 20px ${color}40`,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              <Save size={18} />
              Crear Proyecto
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
