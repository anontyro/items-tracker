import Store from 'electron-store';
import { app } from 'electron';
import path from 'path';

export interface AppSettings {
  apiBaseUrl: string;
  apiKey: string;
  adminApiKey?: string;
  pollingIntervalSeconds: number;
  enableNotifications: boolean;
  quitOnWindowClose: boolean;
  historyRetentionDays: number;
  hasCompletedSetup: boolean;
}

const defaultSettings: AppSettings = {
  apiBaseUrl: 'http://localhost:3005',
  apiKey: '',
  adminApiKey: '',
  pollingIntervalSeconds: 60,
  enableNotifications: true,
  quitOnWindowClose: false,
  historyRetentionDays: 90,
  hasCompletedSetup: false,
};

// Store schema for validation
const schema = {
  apiBaseUrl: {
    type: 'string',
    default: defaultSettings.apiBaseUrl,
  },
  apiKey: {
    type: 'string',
    default: defaultSettings.apiKey,
  },
  adminApiKey: {
    type: 'string',
    default: defaultSettings.adminApiKey,
  },
  pollingIntervalSeconds: {
    type: 'number',
    minimum: 10,
    maximum: 3600,
    default: defaultSettings.pollingIntervalSeconds,
  },
  enableNotifications: {
    type: 'boolean',
    default: defaultSettings.enableNotifications,
  },
  quitOnWindowClose: {
    type: 'boolean',
    default: defaultSettings.quitOnWindowClose,
  },
  historyRetentionDays: {
    type: 'number',
    minimum: 1,
    maximum: 365,
    default: defaultSettings.historyRetentionDays,
  },
  hasCompletedSetup: {
    type: 'boolean',
    default: defaultSettings.hasCompletedSetup,
  },
};

class SettingsService {
  private store: Store<AppSettings>;
  private static instance: SettingsService | null = null;

  private constructor() {
    this.store = new Store<AppSettings>({
      name: 'settings',
      schema,
      cwd: path.join(app.getPath('userData'), 'config'),
    });
  }

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  getAll(): AppSettings {
    const settings: Partial<AppSettings> = {};
    (Object.keys(defaultSettings) as Array<keyof AppSettings>).forEach((key) => {
      settings[key] = this.store.get(key, defaultSettings[key]);
    });
    return settings as AppSettings;
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key, defaultSettings[key]);
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.store.set(key, value);
  }

  update(settings: Partial<AppSettings>): void {
    Object.entries(settings).forEach(([key, value]) => {
      this.store.set(key as keyof AppSettings, value as AppSettings[keyof AppSettings]);
    });
  }

  hasValidApiConfig(): boolean {
    const apiBaseUrl = this.get('apiBaseUrl');
    const apiKey = this.get('apiKey');
    
    if (!apiBaseUrl || !apiKey) {
      return false;
    }

    try {
      new URL(apiBaseUrl);
      return true;
    } catch {
      return false;
    }
  }

  reset(): void {
    this.store.clear();
  }
}

export const settingsService = SettingsService.getInstance();
