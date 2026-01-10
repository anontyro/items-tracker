import { PrismaClient } from "@prisma/client";
import fs from "fs";
import { parse } from "csv-parse";
import path from "path";

const prisma = new PrismaClient();

interface CliOptions {
  file: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  let file = "./data/boardgames_enriched.csv";
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--file" && i + 1 < argv.length) {
      file = argv[++i];
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { file, dryRun };
}

function toOptionalInt(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.trunc(n);
}

function toOptionalFloat(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return n;
}

async function main() {
  const { file, dryRun } = parseArgs(process.argv.slice(2));
  const absolutePath = path.resolve(file);

  const stream = fs.createReadStream(absolutePath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
    })
  );

  let processed = 0;

  for await (const record of stream as AsyncIterable<Record<string, unknown>>) {
    const rawBggId = record["bgg_id"] ?? record["id"];
    const bggId = rawBggId != null ? String(rawBggId).trim() : "";
    if (!bggId) {
      continue;
    }

    const rawPrimaryName =
      record["primary_name"] ?? record["primaryName"] ?? record["name"];
    const primaryName =
      rawPrimaryName != null ? String(rawPrimaryName).trim() : "";
    if (!primaryName) {
      continue;
    }

    const rawName = record["name"];
    const name = rawName != null ? String(rawName).trim() || null : null;

    const yearPublished = toOptionalInt(record["year_published"]);
    const rank = toOptionalInt(record["rank"]);
    const bayesAverage = toOptionalFloat(record["bayes_average"]);
    const average = toOptionalFloat(record["average"]);
    const usersRated = toOptionalInt(record["users_rated"]);

    const now = new Date();

    if (!dryRun) {
      await prisma.bggGame.upsert({
        where: { bggId },
        create: {
          bggId,
          primaryName,
          name,
          yearPublished: yearPublished ?? undefined,
          rank: rank ?? undefined,
          bayesAverage: bayesAverage ?? undefined,
          average: average ?? undefined,
          usersRated: usersRated ?? undefined,
          createdAt: now,
          updatedAt: now,
          lastSeenAt: now,
        },
        update: {
          primaryName,
          name,
          yearPublished: yearPublished ?? undefined,
          rank: rank ?? undefined,
          bayesAverage: bayesAverage ?? undefined,
          average: average ?? undefined,
          usersRated: usersRated ?? undefined,
          lastSeenAt: now,
          updatedAt: now,
        },
      });
    }

    processed += 1;
    if (processed % 1000 === 0) {
      console.log(`Processed ${processed} rows`);
    }
  }

  if (dryRun) {
    console.log(`Dry run complete. Would have processed ${processed} rows.`);
  } else {
    console.log(`Import complete. Processed ${processed} rows.`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  void prisma.$disconnect().finally(() => {
    process.exit(1);
  });
});
