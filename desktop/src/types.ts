// Type definitions for Electron API exposed via preload script

export interface ElectronAPI {
  // App info
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<'darwin' | 'win32' | 'linux'>;
  
  // Settings
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  hasValidSettings: () => Promise<boolean>;
  
  // Database sync
  syncData: () => Promise<SyncResult>;
  getLastSyncTime: () => Promise<string | null>;
  
  // Notifications
  sendNotification: (title: string, body: string) => Promise<void>;
  
  // IPC events
  onSettingsChanged: (callback: (settings: AppSettings) => void) => void;
  removeSettingsChangedListener: () => void;
}

export interface AppSettings {
  apiBaseUrl: string;
  apiKey: string;
  pollingIntervalSeconds: number;
  enableNotifications: boolean;
  quitOnWindowClose: boolean;
  historyRetentionDays: number;
}

export interface SyncResult {
  success: boolean;
  productsSynced: number;
  priceHistorySynced: number;
  lastSyncTime: string;
  error?: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
