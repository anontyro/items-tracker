// Shared UI components for Board Game Price Tracker
// Reusable across Next.js frontend and Electron desktop app

export { ItemHistory } from './components/ItemHistory';
export { ProductListItem } from './components/ProductListItem';

// Re-export MUI for convenience (apps can still import directly)
export * from '@mui/material';
export * from '@mui/icons-material';
