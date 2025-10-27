import { NextResponse } from "next/server";

const ORIGIN_API_BASE = process.env.ORIGIN_API_BASE || "http://localhost:3000";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const pageToken = url.searchParams.get("pageToken") ?? "";
  const maxResults = url.searchParams.get("maxResults") ?? "24";

  const upstream = new URL(`${ORIGIN_API_BASE}/videos`);
  if (q) upstream.searchParams.set("q", q);
  if (pageToken) upstream.searchParams.set("pageToken", pageToken);
  if (maxResults) upstream.searchParams.set("maxResults", maxResults);

  try {
    const res = await fetch(upstream, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text || res.statusText }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    return NextResponse.json({ error: error.message ?? "Upstream error" }, { status: 502 });
  }
}
