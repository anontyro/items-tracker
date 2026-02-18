import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";

import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Controller("v1/products")
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private readonly prisma: PrismaService) {}

  private assertApiKey(apiKey: string | undefined): void {
    const expectedKey = process.env.FRONTEND_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      throw new UnauthorizedException("Invalid API key");
    }
  }

  @Get()
  async searchProducts(
    @Headers("x-api-key") apiKey: string | undefined,
    @Query("q") q?: string,
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string,
    @Query("siteId") siteId?: string,
  ) {
    this.assertApiKey(apiKey);

    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);
    const offset = Math.max(Number(offsetRaw) || 0, 0);

    const where: Prisma.ProductWhereInput = {};

    if (q) {
      where.name = {
        contains: q,
        mode: "insensitive",
      };
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

    return {
      items,
      total,
    };
  }

  @Get("missing-bgg")
  async getProductsMissingBgg(
    @Headers("x-api-key") apiKey: string | undefined,
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string,
  ) {
    this.assertApiKey(apiKey);

    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);
    const offset = Math.max(Number(offsetRaw) || 0, 0);

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

    return {
      items,
      total,
    };
  }

  @Get(":id")
  async getProductById(
    @Headers("x-api-key") apiKey: string | undefined,
    @Param("id") id: string,
  ) {
    this.assertApiKey(apiKey);

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        sources: {
          orderBy: { sourceName: "asc" },
        },
      },
    });
    console.log("id is", id);
    console.log("product is", product);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return product;
  }

  @Get(":id/history")
  async getProductHistory(
    @Headers("x-api-key") apiKey: string | undefined,
    @Param("id") id: string,
    @Query("limit") limitRaw?: string,
  ) {
    this.assertApiKey(apiKey);

    const limit = Math.min(Math.max(Number(limitRaw) || 365, 1), 365);

    const items = await this.prisma.priceHistory.findMany({
      where: { productId: id },
      orderBy: { scrapedAt: "desc" },
      take: limit,
    });

    return { items };
  }

  @Post(":id/bgg")
  async setProductBggId(
    @Headers("x-api-key") apiKey: string | undefined,
    @Param("id") id: string,
    @Body()
    body: {
      bggId?: string | null;
      bggCanonicalName?: string | null;
    },
  ) {
    this.assertApiKey(apiKey);

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
