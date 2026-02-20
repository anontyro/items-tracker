import { Injectable, Logger } from "@nestjs/common";

import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

function buildFuzzySearchWhere(
  q?: string,
): Prisma.ProductWhereInput | undefined {
  const raw = (q ?? "").trim();
  if (!raw) {
    return undefined;
  }

  // Replace most punctuation and separators with spaces so that
  // "Mission: Red Planet" can be found by "mission red planet".
  const normalised = raw
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  if (!normalised) {
    return undefined;
  }

  const tokens = Array.from(
    new Set(
      normalised
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    ),
  );

  if (tokens.length === 0) {
    return undefined;
  }

  return {
    AND: tokens.map((token) => ({
      OR: [
        {
          name: {
            contains: token,
            mode: "insensitive",
          },
        },
        {
          bggCanonicalName: {
            contains: token,
            mode: "insensitive",
          },
        },
      ],
    })),
  };
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async searchProducts(params: {
    q?: string;
    limit: number;
    offset: number;
    siteId?: string;
  }): Promise<{ items: any[]; total: number }> {
    const { q, limit, offset, siteId } = params;

    const where: Prisma.ProductWhereInput = {};

    const textWhere = buildFuzzySearchWhere(q);
    if (textWhere) {
      Object.assign(where, textWhere);
    }

    if (siteId) {
      where.sources = {
        some: {
          additionalData: {
            path: ["siteId"],
            equals: siteId,
          },
        },
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { name: "asc" },
        skip: offset,
        take: limit,
        include: {
          sources: {
            select: {
              id: true,
              sourceName: true,
              sourceUrl: true,
              sku: true,
              additionalData: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    this.logger.log({ q, limit, offset, total }, "Products search executed");

    return { items, total };
  }

  async getGroupedProducts(params: {
    q?: string;
    siteId?: string;
    bggId?: string;
  }): Promise<{ items: any[]; total: number }> {
    const { q, siteId, bggId } = params;

    const where: Prisma.ProductWhereInput = {};

    const textWhere = buildFuzzySearchWhere(q);
    if (textWhere) {
      Object.assign(where, textWhere);
    }

    if (siteId) {
      where.sources = {
        some: {
          additionalData: {
            path: ["siteId"],
            equals: siteId,
          },
        },
      };
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        sources: {
          select: {
            id: true,
            sourceName: true,
            sourceUrl: true,
            sku: true,
            additionalData: true,
          },
        },
      },
    });

    const groups = new Map<
      string,
      {
        groupKey: string;
        bggId: string | null;
        name: string;
        type: string;
        products: typeof products;
        sources: (typeof products)[number]["sources"];
      }
    >();

    for (const product of products) {
      const groupKey = product.bggId ?? product.id;
      const existing = groups.get(groupKey);

      if (!existing) {
        groups.set(groupKey, {
          groupKey,
          bggId: product.bggId ?? null,
          name: product.name,
          type: product.type,
          products: [product],
          sources: [...product.sources],
        });
        continue;
      }

      existing.products.push(product);

      const mergedSources = new Map<string, (typeof product.sources)[number]>();
      for (const source of existing.sources) {
        mergedSources.set(source.id, source);
      }
      for (const source of product.sources) {
        if (!mergedSources.has(source.id)) {
          mergedSources.set(source.id, source);
        }
      }
      existing.sources = Array.from(mergedSources.values());
    }

    const items = Array.from(groups.values());

    return {
      items,
      total: items.length,
    };
  }

  async getProductsMissingBgg(params: {
    limit: number;
    offset: number;
  }): Promise<{ items: any[]; total: number }> {
    const { limit, offset } = params;

    const where = {
      bggId: null as string | null,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: offset,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    this.logger.log(
      { limit, offset, total },
      "Products missing BGG ID search executed",
    );

    return { items, total };
  }

  async getProductById(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        sources: {
          orderBy: { sourceName: "asc" },
        },
      },
    });
  }

  async getProductHistory(id: string, limit: number) {
    const items = await this.prisma.priceHistory.findMany({
      where: { productId: id },
      orderBy: { scrapedAt: "desc" },
      take: limit,
    });

    return { items };
  }

  async setProductBggId(
    id: string,
    body: {
      bggId?: string | null;
      bggCanonicalName?: string | null;
    },
  ) {
    const { bggId, bggCanonicalName } = body;

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        bggId: bggId ?? null,
        bggCanonicalName: bggCanonicalName ?? null,
      },
      include: {
        sources: {
          orderBy: { sourceName: "asc" },
        },
      },
    });

    return updated;
  }
}
