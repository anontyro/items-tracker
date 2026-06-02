'use client';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { AppSettings } from '../../types';

interface FirstRunWizardProps {
  onComplete: () => void;
}

const steps = ['Welcome', 'API Configuration', 'Test Connection', 'Complete'];

const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:3005');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
    setError(null);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError(null);
  };

  const handleTestConnection = async () => {
    console.log('Test connection clicked');
    try {
      setIsTesting(true);
      setTestResult(null);
      console.log('Calling electronAPI.testConnection with:', { apiBaseUrl, apiKey });
      const result = await window.electronAPI?.testConnection(apiBaseUrl, apiKey);
      console.log('Test connection result:', result);
      setTestResult(result);
    } catch (err) {
      console.error('Test connection error:', err);
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndComplete = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const settings: Partial<AppSettings> = {
        apiBaseUrl,
        apiKey,
        hasCompletedSetup: true,
        enableNotifications: true,
        pollingIntervalSeconds: 60,
        historyRetentionDays: 90,
        quitOnWindowClose: false,
      };

      const result = await window.electronAPI?.saveSettings(settings);

      if (result?.success) {
        onComplete();
      } else {
        setError(result?.error || 'Failed to save settings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const canProceedToTest = apiBaseUrl.trim() && apiKey.trim();
  const canComplete = testResult?.success === true;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
      }}
    >
      <Card sx={{ maxWidth: 700, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
              Welcome to Board Game Price Tracker
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Let's set up your desktop app
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Step Content */}
          {activeStep === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Setup your desktop app
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                This wizard will help you configure the Board Game Price Tracker
                desktop application to connect to your backend API.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                You'll need:
              </Typography>
              <Box sx={{ textAlign: 'left', display: 'inline-block' }}>
                <Typography variant="body2" component="div">
                  • The URL of your backend API server
                </Typography>
                <Typography variant="body2" component="div">
                  • Your frontend API key
                </Typography>
              </Box>
            </Box>
          )}

          {activeStep === 1 && (
            <Box sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter your backend API connection details. These settings can be
                changed later in the Settings menu.
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="API Base URL"
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                    placeholder="http://localhost:3005"
                    helperText="The URL of your backend API server"
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="API Key"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
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
              </Grid>
            </Box>
          )}

          {activeStep === 2 && (
            <Box sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Test your connection to ensure the settings are correct.
              </Typography>

              <Box
                sx={{
                  p: 3,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  mb: 2,
                }}
              >
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>API URL:</strong> {apiBaseUrl}
                </Typography>
                <Typography variant="body2">
                  <strong>API Key:</strong> {'•'.repeat(Math.min(apiKey.length, 20))}
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="contained"
                onClick={handleTestConnection}
                disabled={isTesting || !canProceedToTest}
                startIcon={
                  isTesting ? (
                    <CircularProgress size={20} />
                  ) : testResult?.success ? (
                    <CheckCircleIcon />
                  ) : (
                    <RefreshIcon />
                  )
                }
                sx={{ mb: 2 }}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </Button>

              {testResult && (
                <Alert severity={testResult.success ? 'success' : 'error'}>
                  {testResult.message}
                </Alert>
              )}
            </Box>
          )}

          {activeStep === 3 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Setup Complete!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your Board Game Price Tracker desktop app is now configured
                and ready to use.
              </Typography>
            </Box>
          )}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            {activeStep > 0 && activeStep < 3 && (
              <Button onClick={handleBack} disabled={isSaving}>
                Back
              </Button>
            )}
            <Box sx={{ flexGrow: 1 }} />
            {activeStep === 0 && (
              <Button variant="contained" onClick={handleNext}>
                Get Started
              </Button>
            )}
            {activeStep === 1 && (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!canProceedToTest}
              >
                Next
              </Button>
            )}
            {activeStep === 2 && (
              <Button
                variant="contained"
                onClick={handleSaveAndComplete}
                disabled={!canComplete || isSaving}
              >
                {isSaving ? 'Saving...' : 'Complete Setup'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FirstRunWizard;
