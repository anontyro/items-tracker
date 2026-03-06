import { Box, Button, Container, IconButton, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

import FirstRunWizard from './components/FirstRunWizard';
import SettingsForm from './components/SettingsForm';
import SettingsIcon from '@mui/icons-material/Settings';

const App: React.FC = () => {
  const [hasValidSettings, setHasValidSettings] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSettings();
  }, []);

  const checkSettings = async () => {
    try {
      const isValid = await window.electronAPI?.hasValidSettings();
      setHasValidSettings(isValid ?? false);
    } catch (err) {
      console.error('Failed to check settings:', err);
      setHasValidSettings(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupComplete = () => {
    setHasValidSettings(true);
    setShowSettings(false);
  };

  const handleSettingsSaved = () => {
    setShowSettings(false);
    checkSettings();
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  // Show first-run wizard if no valid settings
  if (!hasValidSettings) {
    return <FirstRunWizard onComplete={handleSetupComplete} />;
  }

  // Show main app or settings
  if (showSettings) {
    return <SettingsForm onSave={handleSettingsSaved} />;
  }

  // Main app placeholder
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1">
          Board Game Price Tracker
        </Typography>
        <IconButton onClick={() => setShowSettings(true)} color="primary">
          <SettingsIcon />
        </IconButton>
      </Stack>

      <Box
        sx={{
          p: 4,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Typography variant="h5" gutterBottom>
          Desktop App Placeholder
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          The main application UI is under development.
        </Typography>
        <Typography variant="body2">
          Settings have been configured. You can access them anytime using the
          settings icon in the top right.
        </Typography>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Status:</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            ✓ Electron renderer is working
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            ✓ Settings configured
          </Typography>
          <Typography variant="body2">
            ⏳ Main UI components coming soon
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={() => setShowSettings(true)}
          sx={{ mt: 2 }}
        >
          Open Settings
        </Button>
      </Box>
    </Container>
  );
};

export default App;
