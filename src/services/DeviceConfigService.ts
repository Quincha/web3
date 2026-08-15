import { storage } from './storage';
import { isTauriRuntime } from './http';

export interface DeviceConfig {
  windowWidth: number;
  windowHeight: number;
  notificationsEnabled: boolean;
  notificationVolume: number; // 0.0 to 1.0
  keyboardShortcuts: {
    commandPalette: string; // e.g. "Ctrl+k"
    startPomodoro: string;  // e.g. "Ctrl+p"
    toggleSidebar: string;  // e.g. "Ctrl+b"
  };
  nativeAppMode: boolean;   // true if running under Electron/Tauri
}

const CACHE_KEY = 'quincha_device_exclusive_config';

const DEFAULT_DEVICE_CONFIG: DeviceConfig = {
  windowWidth: window.innerWidth,
  windowHeight: window.innerHeight,
  notificationsEnabled: true,
  notificationVolume: 0.8,
  keyboardShortcuts: {
    commandPalette: 'k', // modifiers checked in event handler
    startPomodoro: 'p',
    toggleSidebar: 'b'
  },
  nativeAppMode: isTauriRuntime()
};

export class DeviceConfigService {
  /**
   * Load local window/shortcuts configuration. This config is
   * completely isolated from cloud synchronization.
   */
  static loadConfig(): DeviceConfig {
    try {
      const raw = storage.getItem(CACHE_KEY);
      if (raw) {
        return {
          ...DEFAULT_DEVICE_CONFIG,
          ...JSON.parse(raw),
          // Always recalculate runtime window bounds
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight
        };
      }
    } catch { /* fallback to defaults */ }
    return DEFAULT_DEVICE_CONFIG;
  }

  static saveConfig(config: Partial<DeviceConfig>): void {
    const current = this.loadConfig();
    const updated = { ...current, ...config };
    storage.setItem(CACHE_KEY, JSON.stringify(updated));
  }
}
