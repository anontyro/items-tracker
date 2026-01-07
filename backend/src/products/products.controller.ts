import {
  Controller,
  Get,
  Headers,
  Logger,
  NotFoundException,
  Param,
  Query,
  UnauthorizedException,
} from "@nestjs/common";

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
    @Query("offset") offsetRaw?: string
  ) {
    this.assertApiKey(apiKey);

    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);
    const offset = Math.max(Number(offsetRaw) || 0, 0);

    const where = q
      ? {
          name: {
            contains: q,
            mode: "insensitive" as const,
          },
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { name: "asc" },
        skip: offset,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    this.logger.log({ q, limit, offset, total }, "Products search executed");

    return {
      items,
      total,
    };
  }

  @Get(":id")
  async getProductById(
    @Headers("x-api-key") apiKey: string | undefined,
    @Param("id") id: string
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

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return product;
  }

  @Get(":id/history")
  async getProductHistory(
    @Headers("x-api-key") apiKey: string | undefined,
    @Param("id") id: string,
    @Query("limit") limitRaw?: string
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
}
