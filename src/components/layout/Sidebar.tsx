import React, { useState } from 'react';
import { 
   LayoutDashboard, Briefcase, CheckSquare, Calendar, 
   BarChart3, Mail, FileText, Users, Settings, Activity, Flame, BookOpen, Heart, Wallet
} from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { PermissionService } from '../../services/PermissionService';
import type { Role, Module } from '../../services/PermissionService';
import { OfficialLogo } from '../ui/OfficialLogo';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const { userConfig, updateConfig, hasPermission } = useUser();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.5} fill="currentColor" />, module: 'dashboard' as Module },
    { id: 'pomodoro', label: 'Pomodoro', icon: <Flame size={20} strokeWidth={1.5} fill="currentColor" />, module: 'pomodoro' as Module },
    { id: 'tareas', label: 'Tareas', icon: <CheckSquare size={20} strokeWidth={1.5} fill="currentColor" />, module: 'tareas' as Module },
    { id: 'bujo', label: 'Bullet Journal', icon: <BookOpen size={20} strokeWidth={1.5} fill="currentColor" />, module: 'bujo' as Module },
    { id: 'habitos', label: 'Hábitos', icon: <Activity size={20} strokeWidth={1.5} fill="currentColor" />, module: 'habitos' as Module },
    { id: 'health', label: 'Salud', icon: <Heart size={20} strokeWidth={1.5} fill="currentColor" />, module: 'health' as Module },
    { id: 'proyectos', label: 'Proyectos', icon: <Briefcase size={20} strokeWidth={1.5} fill="currentColor" />, module: 'proyectos' as Module },
    { id: 'calendario', label: 'Calendario', icon: <Calendar size={20} strokeWidth={1.5} fill="currentColor" />, module: 'calendario' as Module },
    { id: 'estadicas', label: 'Estadísticas', icon: <BarChart3 size={20} strokeWidth={1.5} fill="currentColor" />, module: 'estadisticas' as Module },
    { id: 'mensajes', label: 'Mensajes', icon: <Mail size={20} strokeWidth={1.5} fill="currentColor" />, badge: 3, module: 'mensajes' as Module },
    { id: 'documentos', label: 'Documentos', icon: <FileText size={20} strokeWidth={1.5} fill="currentColor" />, module: 'documentos' as Module },
    { id: 'finanzas', label: 'Finanzas', icon: <Wallet size={20} strokeWidth={1.5} fill="currentColor" />, module: 'finanzas' as Module },
    { id: 'clientes', label: 'Clientes', icon: <Users size={20} strokeWidth={1.5} fill="currentColor" />, module: 'clientes' as Module },
    { id: 'ajustes', label: 'Ajustes', icon: <Settings size={20} strokeWidth={1.5} fill="currentColor" />, module: 'ajustes' as Module }
  ];

  const handleRoleChange = (role: Role) => {
    updateConfig({ userRole: role });
    setShowRoleMenu(false);
  };

  const getRoleLabel = (role: Role) => {
    return PermissionService.getRoles().find(r => r.id === role)?.label || role;
  };

  return (
    <div className="app-sidebar gsap-stagger-item">
      {/* Brand Header */}
      <div className="sidebar-brand-container">
        <div className="brand-logo-wrapper">
          <div className="brand-logo-q" style={{ background: 'transparent', border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center' }}>
            <OfficialLogo size={36} showGlow={true} variant="white" />
          </div>
          <div className="brand-text-container">
            <span className="brand-name">QUINCHA</span>
            <span className="brand-sub" style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#38bdf8' }}>SYSTEMS</span>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        {menuItems.map(item => {
          // If user role does not have permission to view the module, hide it
          if (!hasPermission(item.module, 'view')) return null;

          return (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => onViewChange(item.id)}
              style={{ justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="nav-icon">{item.icon}</div>
                <span className="nav-label">{item.label}</span>
              </div>
              {(item as any).badge && (
                <div className="nav-label" style={{ 
                  background: 'var(--accent-green)', 
                  color: 'var(--bg-primary)', 
                  fontSize: '10px', 
                  fontWeight: 700, 
                  width: '18px', 
                  height: '18px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  {(item as any).badge}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info & Settings Footer */}
      <div className="sidebar-user-section">
        <div className="user-profile-card" onClick={() => setShowRoleMenu(!showRoleMenu)}>
          <img 
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=32&h=32&q=80" 
            alt="Daniel"
            className="user-avatar"
          />
          <div className="user-info-text">
            <span className="user-name">Daniel</span>
            <span className="user-role">{getRoleLabel(userConfig.userRole)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
