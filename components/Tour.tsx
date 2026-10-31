"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { SAMPLE_TRANSCRIPT } from "@/lib/demo";

/**
 * Self-driving product tour: `/app?tour=1`.
 * Drives the REAL app (real API calls, real state) with an animated cursor and captions,
 * so a full feature walkthrough can be screen-recorded hands-free.
 */

type Caption = { step: string; title: string; body: string } | null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const q = (k: string) => document.querySelector<HTMLElement>(`[data-tour="${k}"]`);

class Cancelled extends Error {}

export default function Tour({ onStart, onEnd }: { onStart: () => void; onEnd: () => void }) {
  const [phase, setPhase] = useState<"ready" | "intro" | "running" | "outro">("ready");
  const [cap, setCap] = useState<Caption>(null);
  const [cursor, setCursor] = useState({ x: -100, y: -100, down: false, visible: false });
  const [voice, setVoice] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ripple, setRipple] = useState<{ x: number; y: number; k: number } | null>(null);
  const cancelled = useRef(false);
  const pos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    (window as any).__tour = true;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelled.current = true;
        onEnd();
      }
    };
    window.addEventListener("keydown", h);
    return () => {
      (window as any).__tour = false;
      window.removeEventListener("keydown", h);
    };
  }, [onEnd]);

  const chk = () => {
    if (cancelled.current) throw new Cancelled();
  };
  const wait = async (ms: number) => {
    await sleep(ms);
    chk();
  };

  async function waitFor(k: string, timeout = 90000, pred?: (el: HTMLElement) => boolean) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      chk();
      const el = q(k);
      if (el && (!pred || pred(el))) return el;
      await sleep(150);
    }
    throw new Error(`Tour: "${k}" did not appear`);
  }

  async function moveTo(el: HTMLElement, opts: { scroll?: boolean; dx?: number; dy?: number } = {}) {
    if (opts.scroll !== false) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      await wait(700);
    }
    const r = el.getBoundingClientRect();
    const x = r.left + (opts.dx ?? r.width / 2);
    const y = r.top + (opts.dy ?? r.height / 2);
    pos.current = { x, y };
    setCursor((c) => ({ ...c, x, y, visible: true }));
    await wait(850);
  }

  async function click(el: HTMLElement) {
    await moveTo(el);
    setCursor((c) => ({ ...c, down: true }));
    setRipple({ ...pos.current, k: Date.now() });
    await wait(160);
    setCursor((c) => ({ ...c, down: false }));
    el.click();
    await wait(450);
  }

  async function type(el: HTMLElement, text: string, cps = 220) {
    await moveTo(el);
    el.focus();
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")!.set!;
    setVoice(true);
    const chunk = Math.max(1, Math.round(cps / 30));
    for (let i = 0; i <= text.length; i += chunk) {
      chk();
      setter.call(el, text.slice(0, i));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      if (el instanceof HTMLTextAreaElement) el.scrollTop = el.scrollHeight;
      await sleep(33);
    }
    setter.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    setVoice(false);
    await wait(400);
  }

  async function show(step: string, title: string, body: string, hold = 0) {
    setCap({ step, title, body });
    if (hold) await wait(hold);
  }

  async function run() {
    const total = 9;
    let n = 0;
    const tick = () => setProgress(++n / total);
    try {
      // 1 · Capture
      await show("1 · Capture", "Speak the meeting", "Hold Caps Lock and Wispr Flow turns rambling speech into text. Messy, half-sentences, no speaker labels.");
      const input = await waitFor("input");
      await type(input, SAMPLE_TRANSCRIPT, 520);
      tick();
      await show("1 · Capture", "One click: run the agent", "It attributes speakers, extracts decisions and owners, resolves dates, and checks memory for conflicts.");
      await click(await waitFor("run", 5000, (el) => !(el as HTMLButtonElement).disabled));
      await show("Agent working", "Groq · gpt-oss-120b · structured output", "Schema-validated JSON with a self-repair retry. Every step of the pipeline is visible on the right.");
      setCursor((c) => ({ ...c, visible: false }));
      await waitFor("approve", 120000);
      tick();

      // 2 · Review
      await wait(600);
      window.scrollTo({ top: 0, behavior: "smooth" });
      await show("2 · Review", "A clean, attributed draft", "Speakers inferred from unlabeled speech, plus a summary. Nothing has been sent yet.", 2200);
      await click(await waitFor("transcript", 5000));
      await show("2 · Review", "Messy → clean transcript", "Filler words removed, every line attributed to a speaker.", 2600);
      const conflicts = q("conflicts");
      if (conflicts) {
        await moveTo(conflicts, { dy: 40 });
        await show("⚠ Memory", "It caught a silent reversal", "Last week the team agreed to launch on 15 Nov, Android first. Today they changed both. The agent flags it, explains the impact on open tasks and suggests a fix.", 5200);
      }
      tick();
      const items = await waitFor("items", 5000);
      await moveTo(items, { dy: 80 });
      await show("2 · Review", "Owners and real dates", "“By Friday” becomes an actual date. Unowned tasks are highlighted in amber, and each item keeps its source quote and confidence.", 4200);
      tick();

      // Voice edit
      await show("🎙 Fix it by voice", "Edit the draft by talking", "No forms. Say what to change, and the agent rewrites the plan.");
      const cmd = await waitFor("cmd", 5000);
      await type(cmd, "Give the support team briefing to Kabir, due Monday, and make it high priority", 260);
      await click(await waitFor("apply", 5000, (el) => !(el as HTMLButtonElement).disabled));
      await waitFor("cmd-reply", 60000);
      await moveTo(q("cmd-reply")!, { scroll: false });
      await wait(2800);
      tick();

      // Human in the loop
      await show("🛑 Human-in-the-loop", "Nothing executes without approval", "You see exactly what will be created, saved and posted before anything happens.");
      await click(await waitFor("approve", 5000));
      await wait(2600);
      await click(await waitFor("confirm", 5000));
      await waitFor("board", 20000);
      tick();

      // 3 · Execute
      window.scrollTo({ top: 0, behavior: "smooth" });
      await show("3 · Execute", "Tasks land in the tracker", "Pushed to Slack, Discord, Zapier or Make. One-click calendar (.ics) and CSV export for Jira and Linear.", 3600);
      const rem = q("reminders");
      if (rem) {
        await show("⏰ Reminders", "Deadline nudges, drafted for you", "Overdue and due-in-48h tasks are found automatically, with a reminder written for each owner.");
        await click(rem);
        await wait(2400);
        await click(await waitFor("send-reminders", 5000));
        await wait(1200);
      }
      const logEl = q("log");
      if (logEl) {
        await moveTo(logEl, { dy: 40 });
        await show("📜 Audit trail", "Every action is logged", "Agent, human and integration actions, so the team always knows what happened.", 3200);
      }
      tick();

      // Memory
      await click(await waitFor("nav-memory", 5000));
      setCursor((c) => ({ ...c, visible: false }));
      await show("🧠 Decision memory", "Decisions remember their history", "Superseded decisions are struck through, so you can see what changed, when and in which meeting.", 4800);
      tick();

      // 4 · Follow up
      await click(await waitFor("nav-digest", 5000));
      await show("4 · Follow up", "The weekly digest writes itself", "Highlights, overdue, at-risk and load by owner, ready to post to your team channel.");
      await click(await waitFor("digest-gen", 5000));
      setCursor((c) => ({ ...c, visible: false }));
      const dg = await waitFor("digest", 60000);
      await wait(900);
      dg.scrollIntoView({ behavior: "smooth", block: "start" });
      await wait(4200);
      tick();

      setCap(null);
      setPhase("outro");
    } catch (e) {
      if (e instanceof Cancelled) return;
      setCap({ step: "Tour paused", title: "Something took too long", body: String((e as Error).message) + ". Press Esc to exit." });
    }
  }

  async function start() {
    onStart();
    setPhase("intro");
    await sleep(3600);
    if (cancelled.current) return;
    setPhase("running");
    run();
  }

  return (
    <>
      {/* Start card: begin recording, then press start */}
      {phase === "ready" && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-md">
          <div className="glass fade-in max-w-md p-8 text-center !bg-white/95">
            <div className="orb-wrap relative mx-auto h-20 w-20">
              <div className="orb active h-20 w-20" />
              <div className="orb-ring" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">Auto-play product tour</h2>
            <p className="mt-2 text-sm text-slate-600">
              The real app drives itself through every feature in about 90 seconds, with live AI calls. Start your screen recorder (<span className="kbd">Win</span> + <span className="kbd">Alt</span> +{" "}
              <span className="kbd">R</span>), then press start. Press <span className="kbd">Esc</span> any time to stop.
            </p>
            <p className="mt-2 text-xs text-amber-700">This resets the app to the demo data.</p>
            <div className="mt-6 flex justify-center gap-2">
              <button onClick={onEnd} className="btn">
                Cancel
              </button>
              <button onClick={start} className="btn btn-primary px-6">
                ▶ Start tour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Intro title card */}
      {phase === "intro" && <TitleCard kicker="Agentic AI Hackathon '26 · Product Space × Wispr Flow" title="Meetings end." accent="Work begins." sub="FollowThrough: the voice-first meeting-to-execution agent" />}

      {/* Outro */}
      {phase === "outro" && (
        <TitleCard
          kicker="Speak it → Review → Execute → Follow up"
          title="FollowThrough."
          accent="Nothing falls through."
          sub="followthrough-agent.vercel.app · Built voice-first with Wispr Flow · Groq"
          onClose={onEnd}
        />
      )}

      {/* Caption bar */}
      {phase === "running" && cap && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center px-4">
          <div key={cap.title} className="tour-caption max-w-2xl rounded-3xl bg-slate-950/90 px-6 py-4 text-white shadow-[0_30px_80px_-20px_rgba(15,23,42,.8)] ring-1 ring-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
              {cap.step}
            </div>
            <div className="mt-1 text-lg font-semibold tracking-tight">{cap.title}</div>
            <div className="mt-0.5 text-sm text-slate-300">{cap.body}</div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400 transition-all duration-700" style={{ width: `${Math.max(4, progress * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Animated cursor */}
      {phase === "running" && (
        <div
          className="pointer-events-none fixed left-0 top-0 z-[85]"
          style={{
            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            transition: "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s",
            opacity: cursor.visible ? 1 : 0,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" style={{ transform: `scale(${cursor.down ? 0.82 : 1})`, transition: "transform .12s", filter: "drop-shadow(0 4px 8px rgba(15,23,42,.45))" }}>
            <path d="M4 2.5l15 8.2-6.6 1.6-3 6.4z" fill="#0f172a" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          {voice && (
            <div className="absolute left-7 top-6 flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
              <span className="bars flex h-3 items-center">
                <span />
                <span />
                <span />
                <span />
              </span>
              Dictating · <span className="kbd !py-0 !text-[10px] !text-slate-700">Caps Lock</span>
            </div>
          )}
        </div>
      )}
      {ripple && phase === "running" && <span key={ripple.k} className="tour-ripple pointer-events-none fixed z-[84]" style={{ left: ripple.x, top: ripple.y }} />}
    </>
  );
}

function TitleCard({ kicker, title, accent, sub, onClose }: { kicker: string; title: string; accent: string; sub: string; onClose?: () => void }) {
  return (
    <div className="tour-title fixed inset-0 z-[95] grid place-items-center overflow-hidden bg-[#070816] p-6 text-center text-white">
      <div className="aurora-dark pointer-events-none absolute inset-0" />
      <div className="relative">
        <div className="orb-wrap relative mx-auto h-28 w-28">
          <div className="orb active h-28 w-28" />
          <div className="orb-ring" />
          <div className="orb-ring r2" />
        </div>
        <div className="tour-rise mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300" style={{ animationDelay: ".2s" }}>
          {kicker}
        </div>
        <h1 className="tour-rise mt-4 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl" style={{ animationDelay: ".45s" }}>
          {title}
          <br />
          <span className="text-gradient-anim">{accent}</span>
        </h1>
        <p className="tour-rise mt-6 text-slate-400" style={{ animationDelay: ".8s" }}>
          {sub}
        </p>
        {onClose && (
          <button onClick={onClose} className="tour-rise btn mt-10" style={{ animationDelay: "1.4s" }}>
            Explore the app yourself →
          </button>
        )}
      </div>
    </div>
  );
}
