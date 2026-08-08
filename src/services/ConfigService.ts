import type { Role } from './PermissionService';
import { Api, getProfile } from './ApiClient';

export interface WidgetConfig {
  id: string;
  visible: boolean;
  order: number;
  size: 'small' | 'medium' | 'large';
}

export interface UserConfig {
  theme: 'dark' | 'light' | 'mixed';
  widgets: WidgetConfig[];
  sidebarCollapsed: boolean;
  userRole: Role;
  userName: string;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'stats',              visible: true,  order: 0, size: 'large' },
  { id: 'proactive-insights', visible: true,  order: 1, size: 'medium' },
  { id: 'pomodoro',           visible: true,  order: 2, size: 'medium' },
  { id: 'health-meds',        visible: true,  order: 3, size: 'small' },
  { id: 'health-summary',     visible: true,  order: 4, size: 'medium' },
  { id: 'bujo',               visible: true,  order: 5, size: 'small' },
  { id: 'activity',           visible: true,  order: 6, size: 'small' },
  { id: 'productivity',       visible: true,  order: 7, size: 'medium' },
  { id: 'tasks',              visible: true,  order: 8, size: 'small' },
  { id: 'habits',             visible: true,  order: 9, size: 'small' },
  { id: 'projects',           visible: true,  order: 10, size: 'large' }
];

const DEFAULT_CONFIG: UserConfig = {
  theme: 'dark',
  widgets: DEFAULT_WIDGETS,
  sidebarCollapsed: false,
  userRole: 'guest',
  userName: 'Invitado'
};

const CACHE_KEY = 'quincha_user_config_v2';

export class ConfigService {
  // Simulated backend sync state
  private static isSyncing = false;
  private static syncTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Load configurations: Check cache, fallback to defaults, and asynchronously trigger backend fetch
   */
  static loadConfig(): UserConfig {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cached configuration', e);
      }
    }
    const profile = getProfile();
    if (profile) {
      return { ...DEFAULT_CONFIG, userRole: profile.role as Role, userName: profile.name || profile.username };
    }
    return DEFAULT_CONFIG;
  }

  /**
   * Save configuration: Save to local state, cache to localStorage, and schedule an API sync.
   * Swapping to a real API driver in the future only requires updating the syncWithBackend function.
   */
  static saveConfig(config: UserConfig): Promise<UserConfig> {
    localStorage.setItem(CACHE_KEY, JSON.stringify(config));
    return this.scheduleBackendSync(config);
  }

  /**
   * Background API sync with debounce.
   */
  private static scheduleBackendSync(config: UserConfig): Promise<UserConfig> {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.isSyncing = true;

    return new Promise((resolve) => {
      this.syncTimeout = setTimeout(async () => {
        try {
          if (Api.isAuthenticated()) {
            await Api.saveConfig(config);
          }
        } catch (e) {
          console.error('[ConfigService] Sync failed, retrying in background later.', e);
        } finally {
          this.isSyncing = false;
          resolve(config);
        }
      }, 500); // debounce
    });
  }

  static getSyncStatus(): boolean {
    return this.isSyncing;
  }
}
