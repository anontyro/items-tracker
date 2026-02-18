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

import { ProductsService } from "./products.service";

@Controller("v1/products")
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private readonly productsService: ProductsService) {}

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

    const result = await this.productsService.searchProducts({
      q,
      limit,
      offset,
      siteId,
    });

    return result;
  }

  @Get("grouped")
  async getGroupedProducts(
    @Headers("x-api-key") apiKey: string | undefined,
    @Query("q") q?: string,
    @Query("siteId") siteId?: string,
  ) {
    this.assertApiKey(apiKey);

    const result = await this.productsService.getGroupedProducts({ q, siteId });

    return result;
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

    const result = await this.productsService.getProductsMissingBgg({
      limit,
      offset,
    });

    return result;
  }

  @Get(":id")
  async getProductById(
    @Headers("x-api-key") apiKey: string | undefined,
    @Param("id") id: string,
  ) {
    this.assertApiKey(apiKey);

    const product = await this.productsService.getProductById(id);
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

    const result = await this.productsService.getProductHistory(id, limit);

    return result;
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

    const updated = await this.productsService.setProductBggId(id, body);

    return updated;
  }
}
