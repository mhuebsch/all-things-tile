import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (Number(req.headers.get("content-length") || 0) > 15000) return NextResponse.json({ error: "Message too long." }, { status: 413 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "The preview form is not connected. Please call 218.591.2200." }, { status: 503 });
  try {
    const raw = await req.text();
    if (raw.length > 15000) return NextResponse.json({ error: "Message too long." }, { status: 413 });
    const body = JSON.parse(raw);
    // The Edge Function derives the rate-limit key from its trusted gateway IP.
    const response = await fetch(`${url}/functions/v1/contact`, {
      method: "POST", headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000)
    });
    const result = await response.json();
    return NextResponse.json(result, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Your message could not be saved. Please try again or call 218.591.2200." }, { status: 503 }); }
}
