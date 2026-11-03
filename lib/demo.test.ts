import { describe, expect, it } from "vitest";
import { demoExtract, SAMPLE_TRANSCRIPT } from "./demo";
import { ExtractResult } from "./schemas";

const IDS = { "launch date": "dec_launch", platform: "dec_platform" };

describe("demoExtract", () => {
  it("conforms to the same schema the live model output is validated against", () => {
    expect(() => ExtractResult.parse(demoExtract("2026-11-03", IDS))).not.toThrow();
  });

  it("resolves relative deadlines from the meeting date (run here in IST, east of UTC)", () => {
    // 2026-11-03 is a Tuesday.
    const items = demoExtract("2026-11-03", IDS).action_items;
    const byPhrase = Object.fromEntries(items.map((i) => [i.deadline_phrase, i.deadline]));
    expect(byPhrase["tomorrow"]).toBe("2026-11-04");
    expect(byPhrase["by Wednesday"]).toBe("2026-11-04");
    expect(byPhrase["by Friday"]).toBe("2026-11-06");
  });

  it("moves 'by Friday' to the following week when the meeting is on a Friday", () => {
    const items = demoExtract("2026-11-06", IDS).action_items;
    expect(items.find((i) => i.deadline_phrase === "by Friday")?.deadline).toBe("2026-11-13");
  });

  it("links each conflict to the active past decision on the same topic", () => {
    const conflicts = demoExtract("2026-11-03", IDS).conflicts;
    expect(conflicts.map((c) => c.past_decision_id)).toEqual(["dec_launch", "dec_platform"]);
  });

  it("leaves the link empty when there is no matching past decision", () => {
    expect(demoExtract("2026-11-03", {}).conflicts.every((c) => c.past_decision_id === "")).toBe(true);
  });

  it("matches the bundled sample transcript it stands in for", () => {
    expect(SAMPLE_TRANSCRIPT).toMatch(/razorpay/i);
    expect(demoExtract("2026-11-03", IDS).summary).toMatch(/Razorpay/);
  });
});
