import { Injectable, Logger } from "@nestjs/common";
import {
  PriceSnapshotBatchDto,
  PriceSnapshotDto,
} from "./dto/price-snapshot.dto";
import { Prisma, Product, ProductSource } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PriceHistoryService {
  private readonly logger = new Logger(PriceHistoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ingestBatch(batch: PriceSnapshotBatchDto): Promise<{
    accepted: number;
    failed: number;
    newProducts: number;
    newSources: number;
    updatedSources: number;
    totalSnapshots: number;
  }> {
    const snapshots = batch.snapshots ?? [];

    let accepted = 0;
    let failed = 0;
    let newProducts = 0;
    let newSources = 0;
    let updatedSources = 0;

    for (const snapshot of snapshots) {
      try {
        const result = await this.persistSnapshot(snapshot);
        accepted += 1;

        if (result.createdProduct) {
          newProducts += 1;
        }

        if (result.createdSource) {
          newSources += 1;
        }

        if (result.updatedSource) {
          updatedSources += 1;
        }
      } catch (error) {
        failed += 1;
        this.logger.error(
          "Failed to ingest price snapshot",
          error instanceof Error ? error.stack : undefined,
          {
            snapshot,
          }
        );
      }
    }

    return {
      accepted,
      failed,
      newProducts,
      newSources,
      updatedSources,
      totalSnapshots: snapshots.length,
    };
  }

  private async persistSnapshot(snapshot: PriceSnapshotDto): Promise<{
    createdProduct: boolean;
    createdSource: boolean;
    updatedSource: boolean;
  }> {
    const result = await this.prisma.$transaction(async (tx) => {
      let product: Product | null = await tx.product.findFirst({
        where: {
          name: snapshot.productName,
          type: snapshot.productType,
        },
      });

      let createdProduct = false;

      if (!product) {
        product = await tx.product.create({
          data: {
            name: snapshot.productName,
            type: snapshot.productType,
          },
        });
        createdProduct = true;
      }

      const existingSource = await tx.productSource.findUnique({
        where: {
          sourceUrl: snapshot.sourceUrl,
        },
      });

      let source: ProductSource;
      let createdSource = false;
      let updatedSource = false;

      const additionalData = snapshot.raw
        ? {
            siteId: snapshot.raw.siteId,
            sourceProductId: snapshot.raw.sourceProductId ?? undefined,
            priceText: snapshot.raw.priceText ?? undefined,
            rrpText: snapshot.raw.rrpText ?? undefined,
            availabilityText: snapshot.raw.availabilityText ?? undefined,
          }
        : undefined;

      if (existingSource) {
        source = await tx.productSource.update({
          where: {
            sourceUrl: snapshot.sourceUrl,
          },
          data: {
            productId: product.id,
            sourceName: snapshot.sourceName,
            sku: snapshot.sku ?? undefined,
            additionalData,
          },
        });
        updatedSource = true;
      } else {
        source = await tx.productSource.create({
          data: {
            productId: product.id,
            sourceName: snapshot.sourceName,
            sourceUrl: snapshot.sourceUrl,
            sku: snapshot.sku ?? undefined,
            additionalData,
          },
        });
        createdSource = true;
      }

      await tx.priceHistory.create({
        data: {
          productId: product.id,
          sourceId: source.id,
          price: new Prisma.Decimal(snapshot.price),
          rrp:
            snapshot.rrp != null ? new Prisma.Decimal(snapshot.rrp) : undefined,
          availability: snapshot.availability ?? undefined,
          scrapedAt: new Date(snapshot.scrapedAt),
          scrapeSuccess: true,
          scrapeJobId: undefined,
          responseTimeMs: undefined,
        },
      });

      return {
        createdProduct,
        createdSource,
        updatedSource,
      };
    });

    return result;
  }
}
