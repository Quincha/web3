import React, { createContext, useContext, useState, useEffect } from 'react';
import { ConfigService } from '../services/ConfigService';
import type { UserConfig } from '../services/ConfigService';

export type Theme = 'dark' | 'light' | 'mixed';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode; initialTheme?: Theme }> = ({ children, initialTheme }) => {
  const [theme, setThemeState] = useState<Theme>(initialTheme || 'dark');

  useEffect(() => {
    // Set HTML attribute for design tokens
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    
    // Save state back to ConfigService
    const config = ConfigService.loadConfig();
    config.theme = newTheme;
    ConfigService.saveConfig(config);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
