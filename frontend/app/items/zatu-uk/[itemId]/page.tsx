import ItemDetails from "../../../../components/item/ItemDetails/ItemDetails";
import { fetchProductDetail } from "../../../../lib/api/products";

const ZatuItemDetails = async ({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) => {
  const { itemId } = await params;

  const productDetails = await fetchProductDetail(itemId);

  console.log("productDetails is", productDetails);

  return <ItemDetails product={productDetails} productId={itemId} />;
};

export default ZatuItemDetails;
