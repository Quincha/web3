import React, { useState } from 'react';
import { 
   LayoutDashboard, Briefcase, CheckSquare, Calendar, 
   BarChart3, Mail, FileText, Users, Settings, ChevronDown, Activity, ChevronLeft, ChevronRight, Flame, BookOpen, Heart, Wallet
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
    { id: 'equipo', label: 'Equipo', icon: <Users size={20} strokeWidth={1.5} fill="currentColor" />, module: 'equipo' as Module },
    { id: 'ajustes', label: 'Ajustes', icon: <Settings size={20} strokeWidth={1.5} fill="currentColor" />, module: 'ajustes' as Module }
  ];

  const handleRoleChange = (role: Role) => {
    updateConfig({ userRole: role });
    setShowRoleMenu(false);
  };

  const getRoleLabel = (role: Role) => {
    return PermissionService.getRoles().find(r => r.id === role)?.label || role;
  };

  const toggleSidebar = () => {
    updateConfig({ sidebarCollapsed: !userConfig.sidebarCollapsed });
  };

  return (
    <div className={`app-sidebar ${userConfig.sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand-container">
        <div className="brand-logo-wrapper">
          <div className="brand-logo-q" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <OfficialLogo size={32} showGlow={true} />
          </div>
          {!userConfig.sidebarCollapsed && (
            <div className="brand-text-container">
              <span className="brand-name">QUINCHA</span>
              <span className="brand-sub">SYSTEMS</span>
            </div>
          )}
        </div>
        <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
          {userConfig.sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
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
              title={userConfig.sidebarCollapsed ? item.label : ''}
              style={{ justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="nav-icon">{item.icon}</div>
                {!userConfig.sidebarCollapsed && <span className="nav-label">{item.label}</span>}
              </div>
              {!userConfig.sidebarCollapsed && (item as any).badge && (
                <div style={{ 
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

      {/* User Profile / Role Switcher */}
      <div className="sidebar-user-section">
        <div 
          className="user-profile-card"
          onClick={() => setShowRoleMenu(!showRoleMenu)}
        >
          <img 
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&fit=crop" 
            alt="User avatar" 
            className="user-avatar"
          />
          {!userConfig.sidebarCollapsed && (
            <div className="user-info-text">
              <span className="user-name" style={{ color: '#FFFFFF' }}>{userConfig.userName}</span>
              <span className="user-role">{getRoleLabel(userConfig.userRole)}</span>
            </div>
          )}
          {!userConfig.sidebarCollapsed && <ChevronDown size={14} className="dropdown-indicator-icon" />}
        </div>

        {/* Floating Switcher Options for Demo */}
        {showRoleMenu && (
          <div className="role-dropdown-menu">
            <span className="menu-title">Cambiar Rol (Demo)</span>
            {PermissionService.getRoles().map(role => (
              <button
                key={role.id}
                className={`role-option-btn ${userConfig.userRole === role.id ? 'selected' : ''}`}
                onClick={() => handleRoleChange(role.id)}
              >
                {role.label}
              </button>
            ))}
          </div>
        )}

        {/* Status Line */}
        {!userConfig.sidebarCollapsed && (
          <div className="system-status-indicator">
            <div className="status-indicator-dot" />
            <span className="status-label">Sistema en línea</span>
            <div className="status-wave-line">
              <Activity size={14} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
