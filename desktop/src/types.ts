// Type definitions for Electron API exposed via preload script

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

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

export interface UpdateResult {
  success: boolean;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  productsSynced: number;
  priceHistorySynced: number;
  lastSyncTime: string;
  error?: string;
}

export interface ElectronAPI {
  // App info
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<'darwin' | 'win32' | 'linux'>;
  
  // Settings
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<UpdateResult>;
  hasValidSettings: () => Promise<boolean>;
  testConnection: (apiBaseUrl: string, apiKey: string) => Promise<TestConnectionResult>;
  resetSettings: () => Promise<UpdateResult>;
  selectDataFolder: () => Promise<{ success: boolean; path?: string }>;
  
  // Database sync
  syncData: () => Promise<SyncResult>;
  getLastSyncTime: () => Promise<string | null>;
  
  // Notifications
  sendNotification: (title: string, body: string) => Promise<void>;
  
  // IPC events
  onSettingsChanged: (callback: (settings: AppSettings) => void) => void;
  removeSettingsChangedListener: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
