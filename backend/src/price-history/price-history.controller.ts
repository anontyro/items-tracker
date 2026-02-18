import { Body, Controller, Logger, Post, UseGuards } from "@nestjs/common";

import { PriceSnapshotBatchDto } from "./dto/price-snapshot.dto";
import { PriceHistoryService } from "./price-history.service";
import { ScraperApiKeyGuard } from "../common/scraper-api-key.guard";

@Controller("v1/price-history")
export class PriceHistoryController {
  private readonly logger = new Logger(PriceHistoryController.name);

  constructor(private readonly priceHistoryService: PriceHistoryService) {}

  @UseGuards(ScraperApiKeyGuard)
  @Post("batch")
  async ingestBatch(@Body() body: PriceSnapshotBatchDto) {
    const count = body.snapshots?.length ?? 0;

    this.logger.log({ count }, "Received price snapshot batch");

    const result = await this.priceHistoryService.ingestBatch(body);

    return result;
  }
}
