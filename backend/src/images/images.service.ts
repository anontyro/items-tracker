import * as fs from "fs";
import * as fsp from "fs/promises";
import * as http from "http";
import * as https from "https";
import * as path from "path";

import { ImageStatus, ProductImage } from "@prisma/client";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

export interface SaveImageFromUrlInput {
  sourceUrl: string;
  remoteImageUrl: string;
}

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getCanonicalKey(productId: string, bggId: string | null): string {
    if (bggId) {
      return `bgg-${bggId}`;
    }
    return `prod-${productId}`;
  }

  private getRelativeImagePath(canonicalKey: string, ext: string): string {
    const safeExt = ext && ext.length <= 10 ? ext : ".jpg";
    return path.join("images", "games", canonicalKey, `primary${safeExt}`);
  }

  private async downloadToFile(url: string, fullPath: string): Promise<void> {
    await fsp.mkdir(path.dirname(fullPath), { recursive: true });

    const client = url.startsWith("https:") ? https : http;

    await new Promise<void>((resolve, reject) => {
      const fileStream = fs.createWriteStream(fullPath);

      const request = client.get(url, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          fileStream.close();
          void fsp.unlink(fullPath).catch(() => undefined);
          reject(
            new Error(
              `Failed to download image. Status code: ${response.statusCode}`,
            ),
          );
          return;
        }

        response.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close();
          resolve();
        });
      });

      request.on("error", (err) => {
        fileStream.close();
        void fsp.unlink(fullPath).catch(() => undefined);
        reject(err);
      });
    });
  }

  private getExtensionFromUrl(remoteUrl: string): string {
    try {
      const u = new URL(remoteUrl);
      const ext = path.extname(u.pathname);
      if (!ext) {
        return ".jpg";
      }
      return ext;
    } catch {
      return ".jpg";
    }
  }

  private getFullPathFromLocalPath(localPath: string): string {
    return path.join(process.cwd(), "public", localPath);
  }

  async saveImageFromUrl(input: SaveImageFromUrlInput): Promise<ProductImage> {
    const { sourceUrl, remoteImageUrl } = input;

    const source = await this.prisma.productSource.findUnique({
      where: { sourceUrl },
      include: { product: true },
    });

    if (!source || !source.product) {
      throw new NotFoundException("Product source not found for image");
    }

    const product = source.product;
    const resolvedBggId = product.bggId ?? null;
    const canonicalKey = this.getCanonicalKey(product.id, resolvedBggId);
    const ext = this.getExtensionFromUrl(remoteImageUrl);
    const relativeImagePath = this.getRelativeImagePath(canonicalKey, ext);
    const fullPath = this.getFullPathFromLocalPath(relativeImagePath);

    this.logger.log(
      { productId: product.id, bggId: resolvedBggId, remoteImageUrl, fullPath },
      "Saving image from scrape URL",
    );

    await this.downloadToFile(remoteImageUrl, fullPath);

    const where: { bggId?: string; productId?: string } = {};
    if (resolvedBggId) {
      where.bggId = resolvedBggId;
    } else {
      where.productId = product.id;
    }

    const existing = await this.prisma.productImage.findFirst({ where });

    if (existing) {
      return this.prisma.productImage.update({
        where: { id: existing.id },
        data: {
          remoteImageUrl,
          localPath: relativeImagePath,
          status: ImageStatus.ACTIVE,
          lastCheckedAt: null,
          bggId: resolvedBggId ?? undefined,
          productId: product.id,
          sourceId: source.id,
        },
      });
    }

    return this.prisma.productImage.create({
      data: {
        remoteImageUrl,
        localPath: relativeImagePath,
        status: ImageStatus.ACTIVE,
        lastCheckedAt: null,
        bggId: resolvedBggId ?? undefined,
        productId: product.id,
        sourceId: source.id,
      },
    });
  }

  async getCanonicalImageForProduct(
    productId: string,
  ): Promise<ProductImage | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return null;
    }

    if (product.bggId) {
      const byBgg = await this.prisma.productImage.findFirst({
        where: { bggId: product.bggId, status: ImageStatus.ACTIVE },
        orderBy: { updatedAt: "desc" },
      });
      if (byBgg) {
        return byBgg;
      }
    }

    const byProduct = await this.prisma.productImage.findFirst({
      where: { productId: product.id, status: ImageStatus.ACTIVE },
      orderBy: { updatedAt: "desc" },
    });

    return byProduct;
  }

  async markImageMissing(imageId: string): Promise<void> {
    await this.prisma.productImage.update({
      where: { id: imageId },
      data: {
        status: ImageStatus.MISSING,
        lastCheckedAt: new Date(),
      },
    });
  }

  async resolveFileForImage(
    image: ProductImage,
  ): Promise<{ fullPath: string } | null> {
    if (!image.localPath) {
      return null;
    }

    const fullPath = this.getFullPathFromLocalPath(image.localPath);

    try {
      await fsp.stat(fullPath);
      return { fullPath };
    } catch (err) {
      this.logger.warn(
        { imageId: image.id, localPath: image.localPath, err },
        "Image file missing on disk; marking as MISSING",
      );
      await this.markImageMissing(image.id);
      return null;
    }
  }
}
