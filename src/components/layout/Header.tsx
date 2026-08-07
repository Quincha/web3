import React, { useState } from 'react';
import { Search, Bell, Mail, Sun, Moon, Sparkles} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { Theme } from '../../context/ThemeContext';
import { SyncStatusBar } from './SyncStatusBar';

export const Header: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const themeOptions = [
    { id: 'dark' as Theme, label: 'Modo Oscuro', icon: <Moon size={16} /> },
    { id: 'light' as Theme, label: 'Modo Claro', icon: <Sun size={16} /> },
    { id: 'mixed' as Theme, label: 'Modo Mixto', icon: <Sparkles size={16} /> }
  ];

  return (
    <header className="app-header">
      {/* Search Input */}
      <div className="header-search-container">
        <Search size={16} className="search-icon" />
        <input 
          type="text" 
          placeholder="Buscar en Quincha Systems..." 
          className="search-field-input"
        />
      </div>

      {/* Action Toolbar */}
      <div className="header-toolbar-actions">
        {/* Sync Indicator */}
        <SyncStatusBar />

        {/* Theme Picker Switcher */}
        <div className="theme-picker-container">
          <button 
            className="toolbar-icon-btn" 
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            title="Cambiar tema"
          >
            {theme === 'dark' && <Moon size={18} />}
            {theme === 'light' && <Sun size={18} />}
            {theme === 'mixed' && <Sparkles size={18} />}
          </button>

          {showThemeMenu && (
            <div className="theme-options-dropdown">
              {themeOptions.map(opt => (
                <button
                  key={opt.id}
                  className={`theme-option-row ${theme === opt.id ? 'active' : ''}`}
                  onClick={() => {
                    setTheme(opt.id);
                    setShowThemeMenu(false);
                  }}
                >
                  <span className="opt-icon">{opt.icon}</span>
                  <span className="opt-label">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mail Inbox Indicator */}
        <button className="toolbar-icon-btn badge-alert">
          <Mail size={18} />
          <span className="badge-alert-dot">2</span>
        </button>

        {/* Notifications */}
        <button className="toolbar-icon-btn badge-alert">
          <Bell size={18} />
          <span className="badge-alert-dot">3</span>
        </button>
      </div>
    </header>
  );
};
