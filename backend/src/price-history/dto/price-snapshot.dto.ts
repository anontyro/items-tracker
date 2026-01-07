export class RawSnapshotMetaDto {
  siteId!: string;
  sourceProductId?: string | null;
  priceText?: string | null;
  rrpText?: string | null;
  availabilityText?: string | null;
}

export class PriceSnapshotDto {
  productName!: string;
  productType!: string;
  sourceName!: string;
  sourceUrl!: string;
  sku?: string | null;
  price!: number;
  currencyCode?: string | null;
  rrp?: number | null;
  availability?: boolean | null;
  scrapedAt!: string;
  raw!: RawSnapshotMetaDto;
}

export class PriceSnapshotBatchDto {
  snapshots!: PriceSnapshotDto[];
}
