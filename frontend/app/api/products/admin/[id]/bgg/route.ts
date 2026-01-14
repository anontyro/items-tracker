import { NextRequest, NextResponse } from "next/server";

function getBackendBaseUrl() {
  const url = process.env.BACKEND_API_URL || "http://localhost:3005";
  return url.replace(/\/$/, "");
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const adminKey = request.headers.get("x-admin-api-key");
  const expectedAdminKey = process.env.ADMIN_API_KEY;

  if (!expectedAdminKey || adminKey !== expectedAdminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backendBase = getBackendBaseUrl();
  const apiKey = process.env.FRONTEND_API_KEY || "";
  const id = context.params.id;

  const backendUrl = `${backendBase}/v1/products/${encodeURIComponent(id)}/bgg`;

  const body = await request.json();

  const res = await fetch(backendUrl, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await res.json();

  return NextResponse.json(data, {
    status: res.status,
  });
}
