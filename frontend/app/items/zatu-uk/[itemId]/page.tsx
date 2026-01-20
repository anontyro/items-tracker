import { Box, Typography } from "@mui/material";
import {
  fetchProductDetail,
  fetchProductHistory,
} from "../../../../lib/api/products";

import ItemHistory from "../../../../components/item/ItemHistory/ItemHistory";

const ZatuItemDetails = async ({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) => {
  const { itemId } = await params;

  const productDetails = await fetchProductDetail(itemId);

  console.log("productDetails is", productDetails);

  return (
    <Box>
      <Typography variant="h1">
        Zatu Item Details for {productDetails.name}
      </Typography>
      <ItemHistory id={itemId} />
    </Box>
  );
};

export default ZatuItemDetails;
