import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ConfigService } from '../services/ConfigService';
import type { UserConfig } from '../services/ConfigService';
import { PermissionService } from '../services/PermissionService';
import type { Role, Module, Action } from '../services/PermissionService';
import { useTheme } from './ThemeContext';
import { Api, getProfile } from '../services/ApiClient';

interface UserContextType {
  userConfig: UserConfig;
  updateConfig: (newConfig: Partial<UserConfig>) => Promise<void>;
  hasPermission: (module: Module, action: Action) => boolean;
  isSyncing: boolean;
  username: string;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setTheme } = useTheme();
  const [userConfig, setUserConfig] = useState<UserConfig>(() => ConfigService.loadConfig());
  const [isSyncing, setIsSyncing] = useState(false);
  const [username, setUsername] = useState(() => getProfile()?.username || '');
  const [currentRole, setCurrentRole] = useState<Role>(() => (getProfile()?.role as Role) || ConfigService.loadConfig().userRole);

  // Sync default role from the authenticated profile and on login
  useEffect(() => {
    const syncFromProfile = () => {
      const profile = getProfile();
      if (profile) {
        setUsername(profile.username);
        setCurrentRole(profile.role as Role);
        setUserConfig((prev) => (prev.userRole !== profile.role ? { ...prev, userRole: profile.role as Role } : prev));
      }
    };
    syncFromProfile();
    window.addEventListener('quincha-auth', syncFromProfile);
    return () => window.removeEventListener('quincha-auth', syncFromProfile);
  }, []);

  // Sync initial theme from config
  useEffect(() => {
    setTheme(userConfig.theme);
  }, [userConfig.theme, setTheme]);

  const updateConfig = useCallback(async (newConfig: Partial<UserConfig>) => {
    const updated = { ...userConfig, ...newConfig } as UserConfig;
    // Never allow the client to elevate its own role to a higher one than it has.
    const profileRole = getProfile()?.role as Role | undefined;
    if (newConfig.userRole && profileRole && profileRole !== 'super-admin') {
      updated.userRole = profileRole;
    }
    setUserConfig(updated);

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

  const logout = useCallback(async () => {
    await Api.logout();
    setUserConfig(ConfigService.loadConfig());
    setUsername('');
    // Reload to return to the login screen with a clean state
    window.location.href = '/';
  }, []);

  const hasPermission = useCallback((module: Module, action: Action): boolean => {
    return PermissionService.hasPermission(currentRole, module, action);
  }, [currentRole]);

  return (
    <UserContext.Provider value={{ userConfig, updateConfig, hasPermission, isSyncing, username, logout }}>
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
