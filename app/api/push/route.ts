import { NextResponse } from "next/server";

/**
 * Executes an approved action against the connected integration.
 * Only called after explicit human confirmation in the UI.
 *
 * Supported webhooks (allow-listed hosts to prevent SSRF):
 *  - Slack Incoming Webhook   https://hooks.slack.com/...
 *  - Discord channel webhook  https://discord.com/api/webhooks/...
 *  - Zapier / Make catch hook https://hooks.zapier.com/... , https://hook.<region>.make.com/...
 *    (receives structured JSON → create Trello / Asana / Jira / Notion tasks downstream)
 */
type Kind = "slack" | "discord" | "zapier" | "make";

function detect(url: URL): Kind | null {
  if (url.protocol !== "https:") return null;
  const h = url.hostname;
  if (h === "hooks.slack.com") return "slack";
  if ((h === "discord.com" || h === "discordapp.com") && url.pathname.startsWith("/api/webhooks/")) return "discord";
  if (h === "hooks.zapier.com") return "zapier";
  if (/^hook\.[a-z0-9]+\.make\.com$/.test(h)) return "make";
  return null;
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    text: string;
    event?: string;
    tasks?: unknown[];
    webhook?: string;
  };
  const raw = body.webhook || process.env.SLACK_WEBHOOK_URL;
  if (!raw) return NextResponse.json({ mode: "simulated" });

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 });
  }
  const kind = detect(url);
  if (!kind) return NextResponse.json({ error: "Unsupported webhook. Use Slack, Discord, Zapier or Make." }, { status: 400 });

  let payload: unknown;
  if (kind === "slack") payload = { text: body.text };
  else if (kind === "discord") payload = { content: toDiscord(body.text).slice(0, 1990), username: "FollowThrough" };
  else payload = { event: body.event ?? "message", text: body.text, tasks: body.tasks ?? [], source: "FollowThrough", sent_at: new Date().toISOString() };

  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) return NextResponse.json({ error: `${kind} returned ${r.status}` }, { status: 502 });
  } catch {
    return NextResponse.json({ error: `Could not reach ${kind}` }, { status: 502 });
  }
  return NextResponse.json({ mode: kind });
}

/** Slack mrkdwn → Discord markdown */
function toDiscord(s: string) {
  return s.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1**$2**");
}
