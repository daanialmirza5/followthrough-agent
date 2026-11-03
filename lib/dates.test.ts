import { describe, expect, it } from "vitest";
import { calendarBlock, weekday } from "./dates";

describe("weekday", () => {
  it("names the day of an ISO date regardless of the server timezone", () => {
    expect(weekday("2026-11-03")).toBe("Tuesday");
    expect(weekday("2026-11-22")).toBe("Sunday");
  });

  it("returns an empty string for an invalid date", () => {
    expect(weekday("not-a-date")).toBe("");
  });
});

describe("calendarBlock", () => {
  it("lists every day from today with relative tags", () => {
    const lines = calendarBlock("2026-11-03", 8).split("\n").slice(1);
    expect(lines).toHaveLength(9);
    expect(lines[0]).toBe("2026-11-03 Tuesday (today)");
    expect(lines[1]).toBe("2026-11-04 Wednesday (tomorrow)");
    expect(lines[3]).toBe("2026-11-06 Friday (this week)");
    expect(lines[7]).toBe("2026-11-10 Tuesday (next week)");
  });

  it("crosses month boundaries correctly", () => {
    expect(calendarBlock("2026-11-30", 1)).toContain("2026-12-01 Tuesday (tomorrow)");
  });

  it("returns nothing for an invalid date", () => {
    expect(calendarBlock("garbage")).toBe("");
  });
});
