"use client";

import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { ReactNode } from "react";
import { useState } from "react";

let theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#90caf9",
    },
    secondary: {
      main: "#f48fb1",
    },
    background: {
      default: "#0b1020",
      paper: "#151a2c",
    },
  },
  typography: {
    fontFamily: [
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "sans-serif",
    ].join(","),
  },
});

theme = createTheme(theme, {
  components: {
    MuiLink: {
      styleOverrides: {
        root: {
          color: theme.palette.primary.light,
          textDecoration: "none",
          "&:hover": {
            color: theme.palette.primary.main,
            textDecoration: "none",
          },
        },
      },
    },
  },
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
