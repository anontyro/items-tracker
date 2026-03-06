'use client';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { AppSettings } from '../../types';

interface SettingsFormProps {
  onSave?: () => void;
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

const SettingsForm: React.FC<SettingsFormProps> = ({ onSave }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdminApiKey, setShowAdminApiKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const savedSettings = await window.electronAPI?.getSettings();
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      const result = await window.electronAPI?.saveSettings(settings);
      
      if (result?.success) {
        onSave?.();
      } else {
        setError(result?.error || 'Failed to save settings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const result = await window.electronAPI?.testConnection(
        settings.apiBaseUrl,
        settings.apiKey
      );
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      try {
        await window.electronAPI?.resetSettings();
        await loadSettings();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reset settings');
      }
    }
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    const { name, value } = event.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    const { name } = event.target;
    setSettings((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSliderChange = (_event: Event, value: number | number[]) => {
    setSettings((prev) => ({
      ...prev,
      pollingIntervalSeconds: value as number,
    }));
  };

  const handleRetentionChange = (_event: Event, value: number | number[]) => {
    setSettings((prev) => ({
      ...prev,
      historyRetentionDays: value as number,
    }));
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure your Board Game Price Tracker connection and preferences.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            API Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Connect to the Board Game Price Tracker backend API.
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                label="API Base URL"
                name="apiBaseUrl"
                value={settings.apiBaseUrl}
                onChange={handleChange}
                placeholder="http://localhost:3005"
                helperText="The URL of your backend API server"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleTestConnection}
                disabled={isTesting || !settings.apiBaseUrl || !settings.apiKey}
                startIcon={isTesting ? <CircularProgress size={20} /> : testResult?.success ? <CheckCircleIcon /> : <RefreshIcon />}
                sx={{ height: 56 }}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </Button>
            </Grid>

            {testResult && (
              <Grid size={{ xs: 12 }}>
                <Alert severity={testResult.success ? 'success' : 'error'}>
                  {testResult.message}
                </Alert>
              </Grid>
            )}

            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                label="API Key"
                name="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={handleChange}
                placeholder="Your frontend API key"
                helperText="Required for API access"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowApiKey(!showApiKey)}
                        edge="end"
                      >
                        {showApiKey ? '🙈' : '👁️'}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                label="Admin API Key (Optional)"
                name="adminApiKey"
                type={showAdminApiKey ? 'text' : 'password'}
                value={settings.adminApiKey || ''}
                onChange={handleChange}
                placeholder="Your admin API key"
                helperText="Required for admin features"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowAdminApiKey(!showAdminApiKey)}
                        edge="end"
                      >
                        {showAdminApiKey ? '🙈' : '👁️'}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Sync & Polling
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure how often the app checks for updates.
          </Typography>

          <Box sx={{ px: 1 }}>
            <Typography gutterBottom>
              Polling Interval: {settings.pollingIntervalSeconds} seconds
            </Typography>
            <Slider
              value={settings.pollingIntervalSeconds}
              onChange={handleSliderChange}
              min={10}
              max={300}
              step={10}
              valueLabelDisplay="auto"
              marks={[
                { value: 10, label: '10s' },
                { value: 60, label: '1m' },
                { value: 120, label: '2m' },
                { value: 300, label: '5m' },
              ]}
            />
            <FormHelperText>
              Lower values mean more frequent updates but higher API usage.
            </FormHelperText>
          </Box>

          <Box sx={{ px: 1, mt: 2 }}>
            <Typography gutterBottom>
              Price History Retention: {settings.historyRetentionDays} days
            </Typography>
            <Slider
              value={settings.historyRetentionDays}
              onChange={handleRetentionChange}
              min={7}
              max={365}
              step={7}
              valueLabelDisplay="auto"
              marks={[
                { value: 7, label: '1w' },
                { value: 30, label: '1m' },
                { value: 90, label: '3m' },
                { value: 365, label: '1y' },
              ]}
            />
            <FormHelperText>
              How much historical price data to keep locally.
            </FormHelperText>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Appearance & Behavior
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Customize how the app behaves.
          </Typography>

          <FormControlLabel
            control={
              <Switch
                name="enableNotifications"
                checked={settings.enableNotifications}
                onChange={handleSwitchChange}
              />
            }
            label="Enable Desktop Notifications"
          />
          <FormHelperText sx={{ ml: 3, mb: 1 }}>
            Show notifications for price drops and back-in-stock alerts.
          </FormHelperText>

          <FormControlLabel
            control={
              <Switch
                name="quitOnWindowClose"
                checked={settings.quitOnWindowClose}
                onChange={handleSwitchChange}
              />
            }
            label="Quit App When Window is Closed"
          />
          <FormHelperText sx={{ ml: 3, mb: 1 }}>
            By default, the app continues running in the background.
          </FormHelperText>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button
          variant="outlined"
          color="error"
          onClick={handleReset}
          disabled={isSaving}
        >
          Reset to Defaults
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving || !settings.apiBaseUrl || !settings.apiKey}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Stack>
    </Box>
  );
};

export default SettingsForm;
