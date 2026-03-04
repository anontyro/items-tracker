'use client';

import { Box, IconButton, ListItem, ListItemText, Stack, Tooltip, Typography } from '@mui/material';
import type { ProductSummary } from 'shared-types';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/Star';

type ProductListItemProps = {
  product: ProductSummary;
  isWatched?: boolean;
  onToggleWatchlist?: () => void;
  actions?: React.ReactNode;
};

export const ProductListItem: React.FC<ProductListItemProps> = ({
  product,
  isWatched = false,
  onToggleWatchlist,
  actions,
}) => {
  const sourceCount = product.sources?.length ?? 0;
  const sources = product.sources ?? [];

  const priceInfo = sources.length > 0
    ? sources.map((s) => {
        // Price info would come from a separate API call in a real implementation
        return { name: s.sourceName, url: s.sourceUrl };
      })
    : [];

  return (
    <ListItem
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <ListItemText
        primary={product.name}
        secondary={
          <Box>
            {sourceCount > 0 && (
              <Typography variant="body2" color="text.secondary" component="span">
                {sourceCount} source{sourceCount > 1 ? 's' : ''} available
              </Typography>
            )}
            {product.bggId && (
              <Typography variant="body2" color="text.secondary" component="span">
                {' • '}BGG ID: {product.bggId}
              </Typography>
            )}
          </Box>
        }
      />
      <Stack direction="row" spacing={1} alignItems="center">
        {onToggleWatchlist && (
          <Tooltip title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}>
            <IconButton
              size="small"
              color={isWatched ? 'warning' : 'default'}
              onClick={onToggleWatchlist}
            >
              {isWatched ? (
                <StarIcon fontSize="small" />
              ) : (
                <StarBorderIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
        {actions}
      </Stack>
    </ListItem>
  );
};

export default ProductListItem;
