import { BGG_ALIAS_MAP, normalizeForMatch } from "./bggAliasMap";

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface CliOptions {
  dryRun: boolean;
  limit?: number;
}

function parseArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let limit: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--limit" && i + 1 < argv.length) {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) {
        limit = Math.floor(n);
      }
    }
  }

  return { dryRun, limit };
}

function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().toLowerCase();
}

async function main() {
  const { dryRun, limit } = parseArgs(process.argv.slice(2));

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const logDir = path.resolve(process.cwd(), "logs", "bgg-link");

  console.log(
    `Starting Product↔BGG linking script (dryRun=${dryRun}, limit=${
      limit ?? "none"
    })`
  );

  const products = await prisma.product.findMany({
    where: { bggId: null },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  console.log(`Fetched ${products.length} products with null bggId`);

  let scanned = 0;
  let matched = 0;
  let updated = 0;
  let ambiguous = 0;
  let unmatched = 0;

  const matchedLog: Array<{
    productId: string;
    productName: string;
    bggId: string;
    bggPrimaryName: string;
  }> = [];

  const ambiguousLog: Array<{
    productId: string;
    productName: string;
    candidates: Array<{
      bggId: string;
      primaryName: string;
      name: string | null;
      yearPublished: number | null;
      rank: number | null;
    }>;
  }> = [];

  const unmatchedLog: Array<{
    productId: string;
    productName: string;
  }> = [];

  for (const product of products) {
    scanned += 1;

    const name = product.name;
    const normName = normalizeName(name);
    if (!normName) {
      unmatched += 1;
      console.log(
        `Skipping product ${product.id} with empty/whitespace name: "${name}"`
      );
      continue;
    }

    // Alias pass: if we have a manual mapping for this product name, try that first.
    const aliasKey = normalizeForMatch(name);
    const aliasCanonicalName = BGG_ALIAS_MAP[aliasKey];

    if (aliasCanonicalName) {
      const aliasCandidates = await (prisma as any).bggGame.findMany({
        where: {
          OR: [
            {
              primaryName: {
                equals: aliasCanonicalName,
                mode: "insensitive",
              },
            },
            {
              name: {
                equals: aliasCanonicalName,
                mode: "insensitive",
              },
            },
          ],
        },
        take: 5,
      });

      if (aliasCandidates.length === 1) {
        const match = aliasCandidates[0];
        matched += 1;

        matchedLog.push({
          productId: product.id,
          productName: name,
          bggId: match.bggId as string,
          bggPrimaryName: match.primaryName as string,
        });

        console.log(
          `${dryRun ? "[DRY-RUN] " : ""}Product ${product.id} ("${name}") ` +
            `→ BGG ${match.bggId} ("${match.primaryName}") [alias]`
        );

        if (!dryRun) {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              bggId: match.bggId as string,
              bggCanonicalName:
                (match.primaryName as string) ?? (match.name as string | null),
            },
          });
          updated += 1;
        }

        continue;
      } else if (aliasCandidates.length > 1) {
        ambiguous += 1;
        ambiguousLog.push({
          productId: product.id,
          productName: name,
          candidates: aliasCandidates.map((c: any) => ({
            bggId: c.bggId as string,
            primaryName: c.primaryName as string,
            name: (c.name as string | null) ?? null,
            yearPublished: (c.yearPublished as number | null) ?? null,
            rank: (c.rank as number | null) ?? null,
          })),
        });
        console.log(
          `Ambiguous alias matches for product ${
            product.id
          } ("${name}") → ${aliasCandidates
            .map((c: any) => `${c.bggId}:${c.primaryName}`)
            .join(", ")}`
        );
        continue;
      }
      // If aliasCandidates.length === 0, fall through to normal heuristic-based matching.
    }

    // First pass: strict case-insensitive equality on primaryName or name.
    let candidates = await (prisma as any).bggGame.findMany({
      where: {
        OR: [
          {
            primaryName: {
              equals: name,
              mode: "insensitive",
            },
          },
          {
            name: {
              equals: name,
              mode: "insensitive",
            },
          },
        ],
      },
      take: 5,
    });

    // Second pass: if no strict matches, try normalized-name equality.
    // This helps with cases like:
    // - "Sushi Go" vs "Sushi Go!"
    // - "7 Wonders: Duel" vs "7 Wonders Duel"
    // - "Jaipur 2nd Edition" vs "Jaipur"
    // - "Ticket to Ride Europe" vs "Ticket to Ride: Europe"
    if (candidates.length === 0) {
      const normProductName = normalizeForMatch(name);

      if (normProductName) {
        const firstToken = normProductName.split(" ")[0];

        const roughCandidates = await (prisma as any).bggGame.findMany({
          where: {
            OR: [
              {
                primaryName: {
                  contains: firstToken,
                  mode: "insensitive",
                },
              },
              {
                name: {
                  contains: firstToken,
                  mode: "insensitive",
                },
              },
            ],
          },
          take: 20,
        });

        candidates = roughCandidates.filter((c: any) => {
          const candidateName =
            (c.primaryName as string) ?? (c.name as string) ?? "";
          return normalizeForMatch(candidateName) === normProductName;
        });
      }
    }

    if (candidates.length === 0) {
      unmatched += 1;
      unmatchedLog.push({ productId: product.id, productName: name });
      continue;
    }

    if (candidates.length > 1) {
      ambiguous += 1;
      ambiguousLog.push({
        productId: product.id,
        productName: name,
        candidates: candidates.map((c: any) => ({
          bggId: c.bggId as string,
          primaryName: c.primaryName as string,
          name: (c.name as string | null) ?? null,
          yearPublished: (c.yearPublished as number | null) ?? null,
          rank: (c.rank as number | null) ?? null,
        })),
      });
      console.log(
        `Ambiguous matches for product ${product.id} ("${name}") → ${candidates
          .map((c: any) => `${c.bggId}:${c.primaryName}`)
          .join(", ")}`
      );
      continue;
    }

    const match = candidates[0];
    matched += 1;

    matchedLog.push({
      productId: product.id,
      productName: name,
      bggId: match.bggId as string,
      bggPrimaryName: match.primaryName as string,
    });

    console.log(
      `${dryRun ? "[DRY-RUN] " : ""}Product ${product.id} ("${name}") ` +
        `→ BGG ${match.bggId} ("${match.primaryName}")`
    );

    if (!dryRun) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          bggId: match.bggId,
          bggCanonicalName:
            (match.primaryName as string) ?? (match.name as string | null),
        },
      });
      updated += 1;
    }
  }

  console.log("Linking summary:");
  console.log(`  scanned:   ${scanned}`);
  console.log(`  matched:   ${matched}`);
  console.log(`  updated:   ${updated}`);
  console.log(`  ambiguous: ${ambiguous}`);
  console.log(`  unmatched: ${unmatched}`);

  // Persist detailed logs to disk for easier debugging / review.
  try {
    fs.mkdirSync(logDir, { recursive: true });

    const summaryPath = path.join(logDir, `summary-${runId}.json`);
    const ambiguousPath = path.join(logDir, `ambiguous-${runId}.json`);
    const unmatchedPath = path.join(logDir, `unmatched-${runId}.json`);
    const matchedPath = path.join(logDir, `matched-${runId}.json`);

    const summaryPayload = {
      dryRun,
      limit: limit ?? null,
      runId,
      timestamp: new Date().toISOString(),
      scanned,
      matched,
      updated,
      ambiguous,
      unmatched,
    };

    fs.writeFileSync(summaryPath, JSON.stringify(summaryPayload, null, 2));
    fs.writeFileSync(ambiguousPath, JSON.stringify(ambiguousLog, null, 2));
    fs.writeFileSync(unmatchedPath, JSON.stringify(unmatchedLog, null, 2));
    fs.writeFileSync(matchedPath, JSON.stringify(matchedLog, null, 2));

    console.log(
      `Detailed logs written to ${logDir} (runId=${runId}). ` +
        `Files: summary, ambiguous, unmatched, matched.`
    );
  } catch (err) {
    console.error("Failed to write BGG link logs", err);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  void prisma.$disconnect().finally(() => {
    process.exit(1);
  });
});
