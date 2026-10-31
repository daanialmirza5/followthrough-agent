import { NextResponse } from "next/server";
import { hasKey, MODEL } from "@/lib/llm";

export async function GET() {
  return NextResponse.json({ live: hasKey(), model: MODEL, slack: Boolean(process.env.SLACK_WEBHOOK_URL) });
}
