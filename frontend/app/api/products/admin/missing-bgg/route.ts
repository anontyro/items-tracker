import { NextRequest, NextResponse } from "next/server";

function getBackendBaseUrl() {
  const url = process.env.BACKEND_API_URL || "http://localhost:3005";
  return url.replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const adminKey = request.headers.get("x-admin-api-key");
  const expectedAdminKey = process.env.ADMIN_API_KEY;

  if (!expectedAdminKey || adminKey !== expectedAdminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const limit = searchParams.get("limit") ?? "50";
  const offset = searchParams.get("offset") ?? "0";

  const backendBase = getBackendBaseUrl();
  const apiKey = process.env.FRONTEND_API_KEY || "";

  const backendUrl = `${backendBase}/v1/products/missing-bgg?limit=${encodeURIComponent(
    limit
  )}&offset=${encodeURIComponent(offset)}`;

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
