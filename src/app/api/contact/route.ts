import { NextRequest, NextResponse } from "next/server";
import { contactConfig } from "@/lib/contact-config";

const maximumBytes = 15000;
const windowMs = 10 * 60 * 1000;
// A best-effort throttle per server instance, in addition to the honeypot.
const attempts = new Map<string, { count: number; expires: number }>();

function json(data: object, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function allowAttempt(key: string, maximum: number, now: number) {
  const entry = attempts.get(key);
  if (entry && entry.expires > now) return ++entry.count <= maximum;
  attempts.set(key, { count: 1, expires: now + windowMs });
  return true;
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.get("host")) return json({ error: "Invalid request origin." }, 403);
    } catch {
      return json({ error: "Invalid request origin." }, 403);
    }
  }
  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return json({ error: "Invalid message format." }, 415);
  }
  if (Number(req.headers.get("content-length") || 0) > maximumBytes) return json({ error: "Message too long." }, 413);
  const reader = req.body?.getReader();
  if (!reader) return json({ error: "Invalid message." }, 400);

  let raw = "";
  let bytes = 0;
  let body;
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximumBytes) {
        await reader.cancel();
        return json({ error: "Message too long." }, 413);
      }
      raw += decoder.decode(value, { stream: true });
    }
    body = JSON.parse(raw + decoder.decode());
  } catch {
    return json({ error: "Invalid message." }, 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid message." }, 400);
  if (body.website) return json({ ok: true, delivered: false });
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (name.length < 2 || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10 || message.length > 5000) {
    return json({ error: "Please enter a valid name, email address, and a message of at least 10 characters." }, 400);
  }

  const config = contactConfig();
  if (!config) return json({ error: "The form is not connected. Please call 218.591.2200." }, 503);
  const now = Date.now();
  for (const [key, entry] of attempts) if (entry.expires <= now) attempts.delete(key);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (attempts.size >= 10000 || !allowAttempt(`ip:${ip}`, 30, now) || !allowAttempt(`email:${email.toLowerCase()}`, 5, now)) {
    return json({ error: "Too many messages. Please try again in 10 minutes or call 218.591.2200." }, 429);
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: config.from,
        to: [config.to],
        reply_to: email,
        subject: "All Things Tile — website inquiry",
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Email provider rejected the request");
    return json({ ok: true, delivered: true });
  } catch {
    return json({ error: "Your message could not be sent. Please try again or call 218.591.2200." }, 503);
  }
}
