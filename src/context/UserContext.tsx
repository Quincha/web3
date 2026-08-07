import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ConfigService } from '../services/ConfigService';
  // @ts-expect-error unused
import type { UserConfig, WidgetConfig } from '../services/ConfigService';
import { PermissionService } from '../services/PermissionService';
  // @ts-expect-error unused
import type { Role, Module, Action } from '../services/PermissionService';
import { useTheme } from './ThemeContext';

interface UserContextType {
  userConfig: UserConfig;
  updateConfig: (newConfig: Partial<UserConfig>) => Promise<void>;
  hasPermission: (module: Module, action: Action) => boolean;
  isSyncing: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setTheme } = useTheme();
  const [userConfig, setUserConfig] = useState<UserConfig>(() => ConfigService.loadConfig());
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync initial theme from config
  useEffect(() => {
    setTheme(userConfig.theme);
  }, []);

  const updateConfig = useCallback(async (newConfig: Partial<UserConfig>) => {
    const updated = { ...userConfig, ...newConfig } as UserConfig;
    setUserConfig(updated);
    
    // Update Theme Context if theme changed
    if (newConfig.theme && newConfig.theme !== userConfig.theme) {
      setTheme(newConfig.theme);
    }

    setIsSyncing(true);
    try {
      await ConfigService.saveConfig(updated);
    } finally {
      setIsSyncing(false);
    }
  }, [userConfig, setTheme]);

  const hasPermission = useCallback((module: Module, action: Action): boolean => {
    return PermissionService.hasPermission(userConfig.userRole, module, action);
  }, [userConfig.userRole]);

  return (
    <UserContext.Provider value={{ userConfig, updateConfig, hasPermission, isSyncing }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
