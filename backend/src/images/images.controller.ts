import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";

import { ImagesService, SaveImageFromUrlInput } from "./images.service";
import { FrontendApiKeyGuard } from "../common/frontend-api-key.guard";
import { ScraperApiKeyGuard } from "../common/scraper-api-key.guard";
import { createReadStream } from "fs";

@Controller()
export class ImagesController {
  private readonly logger = new Logger(ImagesController.name);

  constructor(private readonly imagesService: ImagesService) {}

  @UseGuards(ScraperApiKeyGuard)
  @Post("v1/images/from-scrape")
  async saveFromScrape(@Body() body: SaveImageFromUrlInput) {
    const { sourceUrl, remoteImageUrl } = body;

    this.logger.log(
      { sourceUrl, remoteImageUrl },
      "Received image from scrape request",
    );

    const image = await this.imagesService.saveImageFromUrl({
      sourceUrl,
      remoteImageUrl,
    });

    return {
      id: image.id,
      localPath: image.localPath,
      status: image.status,
    };
  }

  @UseGuards(FrontendApiKeyGuard)
  @Get("v1/games/:id/image")
  async getGameImage(@Param("id") id: string): Promise<StreamableFile> {
    const image = await this.imagesService.getCanonicalImageForProduct(id);

    if (!image) {
      throw new NotFoundException("Image not found");
    }

    const resolved = await this.imagesService.resolveFileForImage(image);
    if (!resolved) {
      throw new NotFoundException("Image not found");
    }

    const fileStream = createReadStream(resolved.fullPath);

    return new StreamableFile(fileStream);
  }
}
