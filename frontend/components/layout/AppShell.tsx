"use client";

import { AppBar, Box, Button, Menu, MenuItem, Toolbar, Typography } from "@mui/material";
import Link from "next/link";
import type { ReactNode, MouseEvent } from "react";
import { useState } from "react";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [itemsAnchorEl, setItemsAnchorEl] = useState<null | HTMLElement>(null);
  const itemsMenuOpen = Boolean(itemsAnchorEl);

  const handleItemsClick = (event: MouseEvent<HTMLButtonElement>) => {
    setItemsAnchorEl(event.currentTarget);
  };

  const handleItemsClose = () => {
    setItemsAnchorEl(null);
  };

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Board Game Price Tracker
          </Typography>

          <Button component={Link} href="/" color="inherit">
            Home
          </Button>

          <Button color="inherit" onClick={handleItemsClick} aria-haspopup="true">
            Items
          </Button>
          <Menu
            anchorEl={itemsAnchorEl}
            open={itemsMenuOpen}
            onClose={handleItemsClose}
            keepMounted
          >
            <MenuItem
              component={Link}
              href="/items/zatu-uk"
              onClick={handleItemsClose}
            >
              Zatu (UK)
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ p: 2 }}>
        {children}
      </Box>
    </Box>
  );
}
