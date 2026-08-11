export type ScrapeIssueType =
  | "selector_timeout"
  | "navigation_retry"
  | "navigation_failed"
  | "pagination_loop_detected"
  | "click_pagination_timeout"
  | "zero_products_on_page"
  | "detail_image_failed"
  | "immediate_push_failed";

export interface ScrapeIssue {
  type: ScrapeIssueType;
  page: number;
  message: string;
}

export interface ScrapeRunStats {
  pagesVisited: number;
  pagesExtracted: number;
  productCount: number;
  issues: ScrapeIssue[];
  // Rough total-page/total-product estimate for the site, derived once
  // early in the run (see `deriveTotals` in boardGameScraper.ts). Null when
  // it couldn't be determined. Used only for progress-log percent/ETA.
  totalPagesEstimate: number | null;
  totalProductsEstimate: number | null;
  // Absolute page number within the site's full catalog for the most
  // recently extracted page — distinct from `pagesExtracted`, which counts
  // pages extracted *this generator invocation* and resets to 1 even on a
  // resumed run that jumps straight to e.g. page 300. Used for resumability
  // bookkeeping (persisting "last completed page").
  currentAbsolutePage: number | null;
  // Wall-clock start time (ms since epoch), used for progress-log ETA calc.
  startedAtMs: number;
}

export function createScrapeRunStats(): ScrapeRunStats {
  return {
    pagesVisited: 0,
    pagesExtracted: 0,
    productCount: 0,
    issues: [],
    totalPagesEstimate: null,
    totalProductsEstimate: null,
    currentAbsolutePage: null,
    startedAtMs: Date.now(),
  };
}

export function recordIssue(
  stats: ScrapeRunStats | undefined,
  issue: ScrapeIssue,
): void {
  stats?.issues.push(issue);
}

export interface SiteRunFlag {
  code: string;
  message: string;
}

export interface SiteRunSummary {
  siteId: string;
  siteName: string;
  runId: string;
  pagesVisited: number;
  pagesExtracted: number;
  productCount: number;
  issueCounts: Partial<Record<ScrapeIssueType, number>>;
  flags: SiteRunFlag[];
  needsAttention: boolean;
  runError: string | null;
}

const ISSUE_DESCRIPTIONS: Record<
  ScrapeIssueType,
  { flagCode: string; describe: (count: number) => string }
> = {
  selector_timeout: {
    flagCode: "selector_timeouts",
    describe: (n) =>
      `Product list selector timed out on ${n} page(s) — selector may be stale or matching hidden/unrelated elements`,
  },
  navigation_retry: {
    flagCode: "navigation_retries",
    describe: (n) =>
      `Page navigation needed a retry ${n} time(s) — site may be slow or rate-limiting`,
  },
  navigation_failed: {
    flagCode: "navigation_failures",
    describe: (n) =>
      `Page navigation failed outright ${n} time(s) after retries — pagination likely stopped early`,
  },
  pagination_loop_detected: {
    flagCode: "pagination_loop",
    describe: (n) =>
      `Pagination loop guard triggered ${n} time(s) — site may be serving repeated pages`,
  },
  click_pagination_timeout: {
    flagCode: "click_pagination_timeout",
    describe: (n) =>
      `Click-based pagination failed to refresh the grid ${n} time(s)`,
  },
  zero_products_on_page: {
    flagCode: "zero_product_pages",
    describe: (n) =>
      `${n} page(s) yielded zero products — selector or pagination may be broken`,
  },
  detail_image_failed: {
    flagCode: "detail_image_failures",
    describe: (n) => `Failed to fetch a detail-page image for ${n} product(s)`,
  },
  immediate_push_failed: {
    flagCode: "immediate_push_failures",
    describe: (n) =>
      `${n} page batch(es) failed to push to the backend immediately — durably queued for retry by the sync worker, not lost`,
  },
};

export function summarizeSiteRun(input: {
  siteId: string;
  siteName: string;
  runId: string;
  stats: ScrapeRunStats;
  productCount: number;
  runError: string | null;
}): SiteRunSummary {
  const { siteId, siteName, runId, stats, productCount, runError } = input;

  const issueCounts: Partial<Record<ScrapeIssueType, number>> = {};
  for (const issue of stats.issues) {
    issueCounts[issue.type] = (issueCounts[issue.type] ?? 0) + 1;
  }

  const flags: SiteRunFlag[] = [];

  for (const [type, count] of Object.entries(issueCounts) as [
    ScrapeIssueType,
    number,
  ][]) {
    const desc = ISSUE_DESCRIPTIONS[type];
    flags.push({ code: desc.flagCode, message: desc.describe(count) });
  }

  if (productCount === 0) {
    flags.push({
      code: "no_products_scraped",
      message: "Zero products were scraped for this site",
    });
  }

  if (runError) {
    flags.push({
      code: "backend_push_failed",
      message: `Failed to push results to backend: ${runError}`,
    });
  }

  return {
    siteId,
    siteName,
    runId,
    pagesVisited: stats.pagesVisited,
    pagesExtracted: stats.pagesExtracted,
    productCount,
    issueCounts,
    flags,
    needsAttention: flags.length > 0,
    runError,
  };
}

export function printRunReport(summaries: SiteRunSummary[]): void {
  if (!summaries.length) {
    return;
  }

  const flagged = summaries.filter((s) => s.needsAttention);

  // eslint-disable-next-line no-console
  console.log("\n================ Scrape Run Summary ================");
  // eslint-disable-next-line no-console
  console.table(
    summaries.map((s) => ({
      site: s.siteId,
      pages: s.pagesExtracted,
      items: s.productCount,
      issues: Object.values(s.issueCounts).reduce((a, b) => a + (b ?? 0), 0),
      status: s.needsAttention ? "NEEDS REVIEW" : "OK",
    })),
  );

  if (flagged.length) {
    // eslint-disable-next-line no-console
    console.log(`Sites needing review (${flagged.length}):`);
    for (const s of flagged) {
      // eslint-disable-next-line no-console
      console.log(`  - ${s.siteId}:`);
      for (const flag of s.flags) {
        // eslint-disable-next-line no-console
        console.log(`      • ${flag.message}`);
      }
    }
  } else {
    // eslint-disable-next-line no-console
    console.log("All sites scraped cleanly.");
  }
  // eslint-disable-next-line no-console
  console.log("======================================================\n");
}
