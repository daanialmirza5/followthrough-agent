"use client";
import { useEffect, useState, useCallback } from "react";
import { PAST_MEETING_TRANSCRIPT } from "./demo";
import type { ActionItemT } from "./schemas";

export type TaskStatus = "todo" | "doing" | "done";
export type Task = ActionItemT & {
  id: string;
  status: TaskStatus;
  meetingId: string;
  meeting: string;
  createdAt: string;
};
export type MemDecision = {
  id: string;
  text: string;
  topic: string;
  made_by: string;
  meeting: string;
  meetingId: string;
  date: string;
  status: "active" | "superseded";
  supersededBy?: string;
};
export type Meeting = { id: string; title: string; date: string; summary: string; transcript: string };
export type LogEntry = { ts: string; text: string; kind: "agent" | "human" | "integration" };
export type State = {
  meetings: Meeting[];
  decisions: MemDecision[];
  tasks: Task[];
  log: LogEntry[];
  settings: { webhook: string };
};

const KEY = "followthrough-v1";
export const uid = () => Math.random().toString(36).slice(2, 10);
export const todayISO = () => new Date().toLocaleDateString("en-CA");
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
};

export function seedState(): State {
  const today = todayISO();
  const pastDate = addDays(today, -7);
  const mid = "m-golive";
  return {
    meetings: [
      {
        id: mid,
        title: "Launch go/no-go",
        date: pastDate,
        summary: "Agreed to launch on 15 Nov, Android first, Pro plan at ₹499/month.",
        transcript: PAST_MEETING_TRANSCRIPT,
      },
    ],
    decisions: [
      { id: "d-launch", text: "Launch on 15 November 2026", topic: "launch date", made_by: "Priya", meeting: "Launch go/no-go", meetingId: mid, date: pastDate, status: "active" },
      { id: "d-platform", text: "Ship Android first, iOS follows in December", topic: "platform", made_by: "Priya", meeting: "Launch go/no-go", meetingId: mid, date: pastDate, status: "active" },
      { id: "d-pricing", text: "Pro plan priced at ₹499/month", topic: "pricing", made_by: "Rahul", meeting: "Launch go/no-go", meetingId: mid, date: pastDate, status: "active" },
    ],
    tasks: [
      { id: uid(), task: "Prepare Play Store listing", owner: "Ananya", deadline: "2026-11-08", deadline_phrase: "by November 8", priority: "high", source_quote: "I'll get the Play Store listing ready by November 8", confidence: "high", status: "doing", meetingId: mid, meeting: "Launch go/no-go", createdAt: pastDate },
      { id: uid(), task: "Finalize onboarding flow copy", owner: "Rahul", deadline: addDays(today, -2), deadline_phrase: "by Thursday", priority: "medium", source_quote: "", confidence: "high", status: "todo", meetingId: mid, meeting: "Launch go/no-go", createdAt: pastDate },
      { id: uid(), task: "Set up product analytics events", owner: "Priya", deadline: addDays(today, -3), deadline_phrase: null, priority: "medium", source_quote: "", confidence: "high", status: "done", meetingId: mid, meeting: "Launch go/no-go", createdAt: pastDate },
      { id: uid(), task: "Book launch-day support rota", owner: "Kabir", deadline: addDays(today, 1), deadline_phrase: "by tomorrow", priority: "high", source_quote: "", confidence: "high", status: "todo", meetingId: mid, meeting: "Launch go/no-go", createdAt: pastDate },
    ],
    log: [{ ts: new Date().toISOString(), text: "Memory seeded with last week's 'Launch go/no-go' meeting.", kind: "agent" }],
    settings: { webhook: "" },
  };
}

export function useStore() {
  const [state, setState] = useState<State | null>(null);
  useEffect(() => {
    let s: State | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) s = JSON.parse(raw);
    } catch {}
    setState(s ?? seedState());
  }, []);
  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);
  const update = useCallback((fn: (s: State) => State) => setState((s) => (s ? fn(s) : s)), []);
  const reset = useCallback(() => setState(seedState()), []);
  return { state, update, reset };
}

export function log(s: State, text: string, kind: LogEntry["kind"] = "agent"): State {
  return { ...s, log: [{ ts: new Date().toISOString(), text, kind }, ...s.log].slice(0, 60) };
}
