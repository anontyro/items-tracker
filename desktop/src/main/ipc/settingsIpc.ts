import { ipcMain, BrowserWindow, dialog } from 'electron';
import { settingsService, AppSettings } from '../services/settingsService';

export function registerSettingsIpc(mainWindow: BrowserWindow): void {
  // Get all settings
  ipcMain.handle('settings:get', () => {
    return settingsService.getAll();
  });

  // Get specific setting
  ipcMain.handle('settings:get-key', (_event, key: string) => {
    const allSettings = settingsService.getAll();
    return (allSettings as any)[key];
  });

  // Update settings
  ipcMain.handle('settings:update', (_event, settings: Partial<AppSettings>) => {
    try {
      settingsService.update(settings);
      // Notify renderer of settings change
      mainWindow.webContents.send('settings:changed', settingsService.getAll());
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Check if API config is valid
  ipcMain.handle('settings:has-valid-api', () => {
    return settingsService.hasValidApiConfig();
  });

  // Reset settings to defaults
  ipcMain.handle('settings:reset', () => {
    try {
      settingsService.reset();
      mainWindow.webContents.send('settings:changed', settingsService.getAll());
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  // Test API connection
  ipcMain.handle('settings:test-connection', async (_event, settings: { apiBaseUrl: string; apiKey: string }) => {
    console.log('Test connection request received:', settings);
    try {
      const url = `${settings.apiBaseUrl.replace(/\/$/, '')}/health`;
      console.log('Testing connection to:', url);
      const response = await fetch(url, {
        headers: {
          'x-api-key': settings.apiKey,
        },
      });
      console.log('Response status:', response.status);

      if (response.ok) {
        return { success: true, message: 'Connection successful!' };
      } else {
        return { 
          success: false, 
          message: `Server responded with status ${response.status}` 
        };
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  });

  // Show folder picker for data directory
  ipcMain.handle('settings:select-data-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Data Directory',
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] };
    }
    return { success: false };
  });
}
