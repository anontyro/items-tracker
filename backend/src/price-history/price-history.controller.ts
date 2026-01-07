import {
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  UnauthorizedException,
} from "@nestjs/common";

import { PriceSnapshotBatchDto } from "./dto/price-snapshot.dto";
import { PriceHistoryService } from "./price-history.service";

@Controller("v1/price-history")
export class PriceHistoryController {
  private readonly logger = new Logger(PriceHistoryController.name);

  constructor(private readonly priceHistoryService: PriceHistoryService) {}

  @Post("batch")
  async ingestBatch(
    @Headers("x-api-key") apiKey: string | undefined,
    @Body() body: PriceSnapshotBatchDto
  ) {
    const expectedKey = process.env.SCRAPER_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      throw new UnauthorizedException("Invalid API key");
    }

    const count = body.snapshots?.length ?? 0;

    this.logger.log({ count }, "Received price snapshot batch");

    const result = await this.priceHistoryService.ingestBatch(body);

    return result;
  }
}
