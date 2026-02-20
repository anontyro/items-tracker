"use client";

import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import type { ProductSummary } from "../../lib/api/products";
import { useAdminApiKey } from "../../lib/hooks/useAdminApiKey";
import { useProductSearch } from "../../lib/hooks/useProductSearch";

const SITE_ROUTE_CONFIG: Record<
  string,
  {
    slug: string;
    label: string;
  }
> = {
  "board-game-co-uk": {
    slug: "zatu-uk",
    label: "Zatu UK",
  },
  "clownfish-games": {
    slug: "clownfish-games",
    label: "Clownfish Games",
  },
};

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [itemsAnchorEl, setItemsAnchorEl] = useState<null | HTMLElement>(null);
  const itemsMenuOpen = Boolean(itemsAnchorEl);

  const [userAnchorEl, setUserAnchorEl] = useState<null | HTMLElement>(null);
  const userMenuOpen = Boolean(userAnchorEl);

  const [systemAnchorEl, setSystemAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const systemMenuOpen = Boolean(systemAnchorEl);
  const { hasAdminKey, setAdminKey } = useAdminApiKey();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);

    return () => {
      clearTimeout(handle);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    const handleClickAway = (event: MouseEvent | MouseEventInit | any) => {
      const target = event.target as Node | null;
      if (!target || !searchContainerRef.current) {
        return;
      }
      if (!searchContainerRef.current.contains(target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickAway as any);

    return () => {
      document.removeEventListener("mousedown", handleClickAway as any);
    };
  }, [searchOpen]);

  const { data: searchData } = useProductSearch({
    q: debouncedSearch,
    offset: 0,
  });

  const searchResults: ProductSummary[] = searchData?.items ?? [];

  const handleItemsClick = (event: MouseEvent<HTMLButtonElement>) => {
    setItemsAnchorEl(event.currentTarget);
  };

  const handleItemsClose = () => {
    setItemsAnchorEl(null);
  };

  const handleUserMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setUserAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserAnchorEl(null);
  };

  const handleSystemMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setSystemAnchorEl(event.currentTarget);
  };

  const handleSystemMenuClose = () => {
    setSystemAnchorEl(null);
  };

  const handleSetAdminApiKey = () => {
    // Basic prompt-based entry for now to avoid extra UI complexity.
    // eslint-disable-next-line no-alert
    const value = window.prompt("Enter admin API key", "");
    if (value && value.trim()) {
      setAdminKey(value.trim());
    }
    handleSystemMenuClose();
  };

  return (
    <Box sx={{ minHeight: "100vh", position: "relative" }}>
      <AppBar position="sticky" color="default" elevation={1}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Board Game Price Tracker
          </Typography>

          <Button component={Link} href="/" color="inherit">
            Home
          </Button>

          <Button
            color="inherit"
            onClick={handleItemsClick}
            aria-haspopup="true"
          >
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
            <MenuItem
              component={Link}
              href="/items/clownfish-games"
              onClick={handleItemsClose}
            >
              ClownFish Games
            </MenuItem>
          </Menu>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              ref={searchContainerRef}
              sx={{ minWidth: 240, position: "relative" }}
            >
              <TextField
                size="small"
                placeholder="Search items..."
                variant="outlined"
                value={searchInput}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  setSearchOpen(true);
                }}
                fullWidth
              />
              {searchOpen && debouncedSearch && searchResults.length > 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    mt: 0.5,
                    bgcolor: "background.paper",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    boxShadow: 3,
                    maxHeight: 320,
                    overflowY: "auto",
                    zIndex: (theme) => theme.zIndex.appBar + 1,
                  }}
                >
                  <List dense>
                    {searchResults.map((item) =>
                      (() => {
                        const firstSource = (item.sources ?? [])[0];
                        const data =
                          (firstSource?.additionalData as
                            | { siteId?: string | null }
                            | null
                            | undefined) ?? null;
                        const siteId = data?.siteId ?? undefined;

                        const config = siteId
                          ? (SITE_ROUTE_CONFIG[siteId] ?? {
                              slug: "zatu-uk",
                              label: siteId,
                            })
                          : {
                              slug: "zatu-uk",
                              label: "Zatu UK",
                            };

                        return (
                          <ListItemButton
                            key={item.id}
                            component={Link}
                            href={`/items/${config.slug}/${item.id}`}
                            onClick={() => {
                              setSearchInput("");
                              setDebouncedSearch("");
                              setSearchOpen(false);
                            }}
                          >
                            <ListItemText
                              primary={item.name}
                              secondary={item.type}
                            />
                          </ListItemButton>
                        );
                      })(),
                    )}
                  </List>
                </Box>
              )}
            </Box>

            <Button
              color="inherit"
              onClick={handleSystemMenuOpen}
              aria-haspopup="true"
            >
              System
            </Button>
            <Menu
              anchorEl={systemAnchorEl}
              open={systemMenuOpen}
              onClose={handleSystemMenuClose}
              keepMounted
            >
              <MenuItem
                component={Link}
                href="/system/dashboard"
                onClick={handleSystemMenuClose}
              >
                System dashboard
              </MenuItem>
              <MenuItem onClick={handleSetAdminApiKey}>
                {hasAdminKey ? "Update Admin API key" : "Set Admin API key"}
              </MenuItem>
            </Menu>

            <IconButton
              size="small"
              onClick={handleUserMenuOpen}
              color="inherit"
              aria-label="User menu"
            >
              <Avatar sx={{ width: 32, height: 32 }}>U</Avatar>
            </IconButton>
            <Menu
              anchorEl={userAnchorEl}
              open={userMenuOpen}
              onClose={handleUserMenuClose}
              keepMounted
            >
              <MenuItem
                component={Link}
                href="/user/watchlist"
                onClick={handleUserMenuClose}
              >
                Watchlist
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ p: 2 }}>
        {children}
      </Box>
    </Box>
  );
}
