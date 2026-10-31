/** Explicit calendar so the model never has to compute weekdays itself (LLMs get this wrong). */
export function calendarBlock(today: string, days = 28): string {
  const base = new Date(today + "T00:00:00Z");
  if (isNaN(base.getTime())) return "";
  const lines: string[] = [];
  for (let i = 0; i <= days; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    const wd = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    const tag = i === 0 ? " (today)" : i === 1 ? " (tomorrow)" : i < 7 ? " (this week)" : i < 14 ? " (next week)" : "";
    lines.push(`${iso} ${wd}${tag}`);
  }
  return `CALENDAR (use this to resolve relative dates; never compute weekdays yourself):\n${lines.join("\n")}`;
}

export function weekday(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}
