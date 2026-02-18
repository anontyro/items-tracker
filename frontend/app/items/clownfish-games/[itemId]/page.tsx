import {
  fetchProductDetail,
  fetchProductHistory,
} from "../../../../lib/api/products";

import ItemDetails from "../../../../components/item/ItemDetails/ItemDetails";

const ClownfishItemDetails = async ({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) => {
  const { itemId } = await params;

  const productDetails = await fetchProductDetail(itemId);
  const productHistory = await fetchProductHistory({ productId: itemId });

  return (
    <ItemDetails
      product={productDetails}
      productHistory={productHistory}
      productId={itemId}
    />
  );
};

export default ClownfishItemDetails;
