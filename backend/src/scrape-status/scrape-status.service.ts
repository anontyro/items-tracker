import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ScrapeRunStatus } from "@prisma/client";

export interface RecordScrapeRunInput {
  siteId: string;
  status: ScrapeRunStatus;
  startedAt: string;
  finishedAt: string;
  itemCount: number;
  errorMessage?: string | null;
  runId?: string | null;
}

export interface ScrapeSiteStatus {
  siteId: string;
  lastRun?: {
    status: ScrapeRunStatus;
    finishedAt: Date;
    itemCount: number;
    runId: string | null;
  };
  lastSuccess?: {
    finishedAt: Date;
    itemCount: number;
    runId: string | null;
  };
  lastFailure?: {
    finishedAt: Date;
    errorMessage: string | null;
    runId: string | null;
  };
}

@Injectable()
export class ScrapeStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async recordRun(input: RecordScrapeRunInput) {
    const startedAt = new Date(input.startedAt);
    const finishedAt = new Date(input.finishedAt);

    return this.prisma.scrapeRun.create({
      data: {
        siteId: input.siteId,
        status: input.status,
        startedAt,
        finishedAt,
        itemCount: input.itemCount,
        errorMessage: input.errorMessage ?? null,
        runId: input.runId ?? null,
      },
    });
  }

  async getStatusPerSite(): Promise<ScrapeSiteStatus[]> {
    const runs = await this.prisma.scrapeRun.findMany({
      orderBy: { finishedAt: "desc" },
    });

    const bySite = new Map<string, ScrapeSiteStatus>();

    for (const run of runs) {
      let acc = bySite.get(run.siteId);
      if (!acc) {
        acc = { siteId: run.siteId };
        bySite.set(run.siteId, acc);
      }

      if (!acc.lastRun) {
        acc.lastRun = {
          status: run.status,
          finishedAt: run.finishedAt,
          itemCount: run.itemCount,
          runId: run.runId,
        };
      }

      if (run.status === ScrapeRunStatus.SUCCESS && !acc.lastSuccess) {
        acc.lastSuccess = {
          finishedAt: run.finishedAt,
          itemCount: run.itemCount,
          runId: run.runId,
        };
      }

      if (run.status === ScrapeRunStatus.FAILURE && !acc.lastFailure) {
        acc.lastFailure = {
          finishedAt: run.finishedAt,
          errorMessage: run.errorMessage ?? null,
          runId: run.runId,
        };
      }
    }

    return Array.from(bySite.values());
  }
}
