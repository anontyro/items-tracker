import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  getPlatform: () => ipcRenderer.invoke('app:get-platform'),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),
  hasValidSettings: () => ipcRenderer.invoke('settings:has-valid'),
  
  // Database sync
  syncData: () => ipcRenderer.invoke('sync:data'),
  getLastSyncTime: () => ipcRenderer.invoke('sync:last-time'),
  
  // Notifications
  sendNotification: (title: string, body: string) => 
    ipcRenderer.invoke('notification:send', title, body),
  
  // IPC events
  onSettingsChanged: (callback: (settings: any) => void) => {
    ipcRenderer.on('settings:changed', (_event, settings) => callback(settings));
  },
  removeSettingsChangedListener: () => {
    ipcRenderer.removeAllListeners('settings:changed');
  },
});

export type ElectronAPI = typeof contextBridge.exposeInMainWorld;
