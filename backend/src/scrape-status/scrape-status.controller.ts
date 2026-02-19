import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";

import { AdminApiKeyGuard } from "../common/admin-api-key.guard";
import { ScraperApiKeyGuard } from "../common/scraper-api-key.guard";
import { ScrapeRunStatus } from "@prisma/client";
import type {
  RecordScrapeRunInput,
  ScrapeSiteStatus,
} from "./scrape-status.service";
import { ScrapeStatusService } from "./scrape-status.service";

@Controller("v1/admin")
export class ScrapeStatusController {
  constructor(private readonly scrapeStatusService: ScrapeStatusService) {}

  @UseGuards(ScraperApiKeyGuard)
  @Post("scrape-runs")
  async recordScrapeRun(@Body() body: RecordScrapeRunInput) {
    // Basic validation; for now just ensure required fields are present.
    if (!body.siteId) {
      throw new BadRequestException("siteId is required");
    }
    if (!body.startedAt || !body.finishedAt) {
      throw new BadRequestException("startedAt and finishedAt are required");
    }
    if (typeof body.itemCount !== "number") {
      throw new BadRequestException("itemCount must be a number");
    }
    if (!body.status) {
      throw new BadRequestException("status is required");
    }

    // Coerce status into the enum if payload was sent as string.
    const normalisedStatus =
      typeof body.status === "string"
        ? (body.status as ScrapeRunStatus)
        : body.status;

    return this.scrapeStatusService.recordRun({
      ...body,
      status: normalisedStatus,
    });
  }

  @UseGuards(AdminApiKeyGuard)
  @Get("scrape-status")
  async getScrapeStatus(): Promise<ScrapeSiteStatus[]> {
    return this.scrapeStatusService.getStatusPerSite();
  }
}
