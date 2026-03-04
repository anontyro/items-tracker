# Board Game Price Tracker - Desktop App

Electron-based desktop application for tracking board game prices across multiple UK retailers.

## Tech Stack

- **Runtime**: Electron 33
- **Renderer**: React 19 + Vite 6
- **State**: React Query (TanStack Query)
- **UI**: Material UI (shared with web frontend)
- **Database**: better-sqlite3 (local cache)
- **Settings**: electron-store
- **Build**: electron-builder

## Development

### Prerequisites

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Ensure the backend API is running:
   ```bash
   pnpm dev:backend
   ```

### Running in Development

```bash
pnpm dev:desktop
```

This will:
- Build the main process in watch mode
- Start the Vite dev server for the renderer
- Launch Electron with hot reload enabled

### Building for Production

```bash
pnpm build:desktop
```

Output will be in the `release/` directory.

## Architecture

### Main Process (`src/main/`)

- `main.ts` - Electron app entry point, window management
- `preload.ts` - Secure bridge between main and renderer
- `ipc/` - IPC handlers for app functionality
- `services/` - Background services (sync, notifications)

### Renderer Process (`src/renderer/`)

- React-based UI using shared components
- Communicates with main process via `window.electronAPI`

### Shared Packages

- `@shared-types` - TypeScript interfaces
- `@shared-api-client` - API client utilities
- `@shared-ui` - Reusable UI components

## Configuration

Settings are stored in `electron-store` and include:

- `apiBaseUrl` - Backend API URL
- `apiKey` - Frontend API key
- `pollingIntervalSeconds` - How often to check for updates
- `enableNotifications` - Desktop notifications toggle
- `quitOnWindowClose` - Whether to quit app or hide to tray
- `historyRetentionDays` - Local price history retention

## macOS-Specific Notes

- App uses `hiddenInset` title bar style for native macOS look
- Traffic light window controls positioned at (12, 12)
- App remains running in background when window is closed (tray mode)
- Notifications use macOS Notification Center

## Future Enhancements

- [ ] Auto-update integration (GitHub Releases or custom server)
- [ ] Tray icon with menu
- [ ] Touch Bar support (if applicable)
- [ ] Notarization for macOS distribution
- [ ] Windows and Linux builds
