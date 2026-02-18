import { NextRequest, NextResponse } from "next/server";

function getBackendBaseUrl() {
  const url = process.env.BACKEND_API_URL || "http://localhost:3005";
  return url.replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q") ?? "";
  const siteId = searchParams.get("siteId") ?? "";
  const bggId = searchParams.get("bggId") ?? "";

  const backendBase = getBackendBaseUrl();
  const apiKey = process.env.FRONTEND_API_KEY || "";

  const backendUrl = new URL("/v1/products/grouped", backendBase);
  if (q) {
    backendUrl.searchParams.set("q", q);
  }
  if (siteId) {
    backendUrl.searchParams.set("siteId", siteId);
  }
  if (bggId) {
    backendUrl.searchParams.set("bggId", bggId);
  }

  const res = await fetch(backendUrl.toString(), {
    headers: {
      "x-api-key": apiKey,
    },
    cache: "no-store",
  });

  const data = await res.json();

  return NextResponse.json(data, {
    status: res.status,
  });
}
