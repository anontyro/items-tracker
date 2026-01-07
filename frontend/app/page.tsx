"use client";

import { Container, Stack, Typography } from "@mui/material";

export default function HomePage() {
  return (
    <Container maxWidth="lg">
      <Stack spacing={2} sx={{ py: 4 }}>
        <Typography variant="h3" component="h1">
          Board Game Price Tracker
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Frontend foundation is ready. Next steps: implement product search,
          game detail pages, and tracked items overview using the backend API.
        </Typography>
      </Stack>
    </Container>
  );
}
