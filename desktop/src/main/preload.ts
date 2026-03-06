import { contextBridge, ipcRenderer } from 'electron';

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

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  getPlatform: () => ipcRenderer.invoke('app:get-platform'),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('settings:update', settings),
  hasValidSettings: () => ipcRenderer.invoke('settings:has-valid-api'),
  testConnection: (apiBaseUrl: string, apiKey: string) => 
    ipcRenderer.invoke('settings:test-connection', { apiBaseUrl, apiKey }),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  selectDataFolder: () => ipcRenderer.invoke('settings:select-data-folder'),
  
  // Database sync
  syncData: () => ipcRenderer.invoke('sync:data'),
  getLastSyncTime: () => ipcRenderer.invoke('sync:last-time'),
  
  // Notifications
  sendNotification: (title: string, body: string) => 
    ipcRenderer.invoke('notification:send', title, body),
  
  // IPC events
  onSettingsChanged: (callback: (settings: AppSettings) => void) => {
    ipcRenderer.on('settings:changed', (_event, settings) => callback(settings));
  },
  removeSettingsChangedListener: () => {
    ipcRenderer.removeAllListeners('settings:changed');
  },
});

export type ElectronAPI = typeof contextBridge.exposeInMainWorld;
