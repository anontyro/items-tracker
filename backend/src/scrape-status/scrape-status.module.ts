import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ScrapeStatusController } from "./scrape-status.controller";
import { ScrapeStatusService } from "./scrape-status.service";
import { AdminApiKeyGuard } from "../common/admin-api-key.guard";
import { ScraperApiKeyGuard } from "../common/scraper-api-key.guard";

@Module({
  imports: [PrismaModule],
  controllers: [ScrapeStatusController],
  providers: [ScrapeStatusService, AdminApiKeyGuard, ScraperApiKeyGuard],
})
export class ScrapeStatusModule {}
