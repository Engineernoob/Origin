import { NextResponse } from "next/server";

const ORIGIN_API_BASE = process.env.ORIGIN_API_BASE!;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cat = url.searchParams.get("cat") ?? "";
  const page = url.searchParams.get("page") ?? "1";
  const q = url.searchParams.get("q") ?? "";

  // pass through to Nest (adjust path to your controller)
  const upstream = new URL(`${ORIGIN_API_BASE}/videos`);
  if (cat) upstream.searchParams.set("cat", cat);
  if (page) upstream.searchParams.set("page", page);
  if (q) upstream.searchParams.set("q", q);

  try {
    const res = await fetch(upstream, {
      // include cookies if you need session auth
      headers: { "content-type": "application/json" },
      // don't cache while developing
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || res.statusText },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Upstream error" },
      { status: 502 }
    );
  }
}
