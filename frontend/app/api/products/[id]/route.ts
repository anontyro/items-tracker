import { NextRequest, NextResponse } from "next/server";

function getBackendBaseUrl() {
  const url = process.env.BACKEND_API_URL || "http://localhost:3005";
  return url.replace(/\/$/, "");
}

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  const backendBase = getBackendBaseUrl();
  const apiKey = process.env.FRONTEND_API_KEY || "";
  const id = context.params.id;

  const backendUrl = `${backendBase}/v1/products/${encodeURIComponent(id)}`;

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
