import { Module } from "@nestjs/common";
import { PriceHistoryController } from "./price-history.controller";
import { PriceHistoryService } from "./price-history.service";
import { PrismaModule } from "../prisma/prisma.module";
import { ScraperApiKeyGuard } from "../common/scraper-api-key.guard";

@Module({
  imports: [PrismaModule],
  controllers: [PriceHistoryController],
  providers: [PriceHistoryService, ScraperApiKeyGuard],
})
export class PriceHistoryModule {}
