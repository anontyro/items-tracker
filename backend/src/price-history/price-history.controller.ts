import { Body, Controller, Logger, Post } from "@nestjs/common";

import { PriceSnapshotBatchDto } from "./dto/price-snapshot.dto";

@Controller("v1/price-history")
export class PriceHistoryController {
  private readonly logger = new Logger(PriceHistoryController.name);

  @Post("batch")
  async ingestBatch(@Body() body: PriceSnapshotBatchDto) {
    const count = body.snapshots?.length ?? 0;

    this.logger.log({ count }, "Received price snapshot batch");

    return {
      accepted: count,
    };
  }
}
