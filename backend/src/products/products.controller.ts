import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { FrontendApiKeyGuard } from "../common/frontend-api-key.guard";
import { ProductsService } from "./products.service";

@UseGuards(FrontendApiKeyGuard)
@Controller("v1/products")
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async searchProducts(
    @Query("q") q?: string,
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string,
    @Query("siteId") siteId?: string,
  ) {
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
    @Query("q") q?: string,
    @Query("siteId") siteId?: string,
    @Query("bggId") bggId?: string,
  ) {
    const result = await this.productsService.getGroupedProducts({
      q,
      siteId,
      bggId,
    });

    return result;
  }

  @Get("missing-bgg")
  async getProductsMissingBgg(
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string,
  ) {
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);
    const offset = Math.max(Number(offsetRaw) || 0, 0);

    const result = await this.productsService.getProductsMissingBgg({
      limit,
      offset,
    });

    return result;
  }

  @Get(":id")
  async getProductById(@Param("id") id: string) {
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
    @Param("id") id: string,
    @Query("limit") limitRaw?: string,
  ) {
    const limit = Math.min(Math.max(Number(limitRaw) || 365, 1), 365);

    const result = await this.productsService.getProductHistory(id, limit);

    return result;
  }

  @Post(":id/bgg")
  async setProductBggId(
    @Param("id") id: string,
    @Body()
    body: {
      bggId?: string | null;
      bggCanonicalName?: string | null;
    },
  ) {
    const updated = await this.productsService.setProductBggId(id, body);

    return updated;
  }
}
