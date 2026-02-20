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

  const backendBase = getBackendBaseUrl();
  const backendUrl = `${backendBase}/v1/admin/scrape-status`;

  const res = await fetch(backendUrl, {
    method: "GET",
    headers: {
      "x-api-key": expectedAdminKey,
    },
    cache: "no-store",
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // ignore JSON parse errors; data will remain null
  }

  return NextResponse.json(data, {
    status: res.status,
  });
}
