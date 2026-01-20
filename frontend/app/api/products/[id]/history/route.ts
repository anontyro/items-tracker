import { NextRequest, NextResponse } from "next/server";

function getBackendBaseUrl() {
  const url = process.env.BACKEND_API_URL || "http://localhost:3005";
  return url.replace(/\/$/, "");
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ?? "365";

  const backendBase = getBackendBaseUrl();
  const apiKey = process.env.FRONTEND_API_KEY || "";
  const { id } = await context.params;

  const backendUrl = `${backendBase}/v1/products/${encodeURIComponent(
    id,
  )}/history?limit=${encodeURIComponent(limit)}`;

  const res = await fetch(backendUrl, {
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
