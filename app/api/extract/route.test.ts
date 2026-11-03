import { afterEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_TRANSCRIPT } from "@/lib/demo";
import { ExtractResult } from "@/lib/schemas";
import { POST } from "./route";

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/extract", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/extract without an API key", () => {
  afterEach(() => vi.useRealTimers());

  it("rejects an empty transcript", async () => {
    const res = await post({ transcript: "   ", meetingDate: "2026-11-03" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Transcript is empty." });
  });

  it("never returns canned output for a real meeting", async () => {
    delete process.env.GROQ_API_KEY;
    const res = await post({ transcript: "Alice: let's ship the API on Monday.", meetingDate: "2026-11-03" });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/GROQ_API_KEY missing/);
  });

  it("serves the labelled demo result for the bundled sample", async () => {
    delete process.env.GROQ_API_KEY;
    vi.useFakeTimers();
    const pending = post({
      transcript: SAMPLE_TRANSCRIPT,
      meetingDate: "2026-11-03",
      memory: [{ id: "dec_launch", text: "Launch on 15 Nov", topic: "launch date", meeting: "Go/no-go", date: "2026-10-27", status: "active" }],
    });
    await vi.runAllTimersAsync();
    const res = await pending;
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.mode).toBe("demo");
    expect(() => ExtractResult.parse(body.result)).not.toThrow();
    expect(body.result.conflicts[0].past_decision_id).toBe("dec_launch");
  });
});
