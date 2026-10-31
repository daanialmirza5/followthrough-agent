"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useStore, uid, todayISO, addDays, log, type State, type Task, type TaskStatus, type MemDecision, type Meeting } from "@/lib/store";
import { SAMPLE_TRANSCRIPT } from "@/lib/demo";
import Tour from "@/components/Tour";
import type { ExtractResult, ActionItemT, DigestResult } from "@/lib/schemas";

type Tab = "capture" | "review" | "tracker" | "memory" | "digest";
type DraftItem = ActionItemT & { include: boolean; _id: string };
type Draft = {
  result: ExtractResult;
  items: DraftItem[];
  decisionInclude: boolean[];
  conflictChoice: Record<number, "supersede" | "keep">;
  transcript: string;
  date: string;
};
type Status = { live: boolean; model: string; slack: boolean };

const AGENT_STEPS = [
  "Attributing speakers",
  "Cleaning up dictation",
  "Extracting decisions",
  "Extracting owners & action items",
  "Resolving deadlines to dates",
  "Checking memory for conflicts",
  "Drafting for your approval",
];

/* ═════════════════════════ App shell ═════════════════════════ */

export default function App() {
  const { state, update, reset } = useStore();
  const [tab, setTab] = useState<Tab>("capture");
  const [status, setStatus] = useState<Status | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tour, setTour] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tour") === "1") {
      setTour(true);
      window.history.replaceState(null, "", "/app");
    }
  }, []);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  if (!state)
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="orb-wrap relative h-16 w-16">
          <div className="orb active h-16 w-16" />
        </div>
      </div>
    );

  const reminders = getReminders(state.tasks);
  const integration = webhookKind(state.settings.webhook);

  const steps: { k: Tab; label: string; sub: string; badge?: string | number; warn?: boolean }[] = [
    { k: "capture", label: "Capture", sub: "Speak it" },
    { k: "review", label: "Review", sub: "Approve", badge: draft ? "1" : undefined },
    { k: "tracker", label: "Execute", sub: "Tracker", badge: reminders.overdue.length || undefined, warn: true },
    { k: "digest", label: "Follow up", sub: "Digest" },
  ];
  const stepIdx = steps.findIndex((s) => s.k === tab);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
        <div className="glass mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="orb-wrap relative h-8 w-8">
              <div className="orb h-8 w-8" style={{ animationDuration: "8s" }} />
            </div>
            <div className="text-left">
              <div className="text-[15px] font-semibold leading-tight tracking-tight">FollowThrough</div>
              <div className="hidden text-[11px] text-slate-500 sm:block">Meeting → execution agent</div>
            </div>
          </Link>

          <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto lg:order-none lg:mx-auto lg:w-auto">
            {steps.map((s, i) => {
              const activeStep = tab === s.k;
              const passed = stepIdx > i;
              return (
                <div key={s.k} className="flex items-center">
                  {i > 0 && <span className={`mx-1 h-[2px] w-4 rounded-full sm:w-6 ${passed || activeStep ? "bg-indigo-400" : "bg-slate-200"}`} />}
                  <button
                    data-tour={`nav-${s.k}`}
                    onClick={() => setTab(s.k)}
                    className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition ${
                      activeStep ? "bg-white shadow-[0_1px_0_#fff_inset,0_4px_12px_-4px_rgba(15,23,42,.25)] ring-1 ring-slate-200" : "hover:bg-slate-900/[0.04]"
                    }`}
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                        activeStep
                          ? "bg-gradient-to-b from-violet-500 to-indigo-600 text-white shadow-[0_2px_0_#3730a3]"
                          : passed
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="leading-tight">
                      <span className={`block text-sm font-medium ${activeStep ? "text-slate-900" : "text-slate-600"}`}>
                        {s.label}
                        {s.badge !== undefined && (
                          <span className={`ml-1.5 rounded-full px-1.5 text-[10px] font-semibold text-white ${s.warn ? "bg-rose-500" : "bg-indigo-500"}`}>{s.badge}</span>
                        )}
                      </span>
                      <span className="hidden text-[10px] text-slate-400 sm:block">{s.sub}</span>
                    </span>
                  </button>
                </div>
              );
            })}
            <span className="mx-2 h-6 w-px bg-slate-200" />
            <button
              data-tour="nav-memory"
              onClick={() => setTab("memory")}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium transition ${
                tab === "memory" ? "bg-white text-slate-900 shadow-[0_1px_0_#fff_inset,0_4px_12px_-4px_rgba(15,23,42,.25)] ring-1 ring-slate-200" : "text-slate-600 hover:bg-slate-900/[0.04]"
              }`}
            >
              🧠 Memory
            </button>
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <span
              className={`chip ${status?.live ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}
              title={status?.live ? `Model: ${status.model}` : "No GROQ_API_KEY: demo mode works with the sample meeting only"}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${status?.live ? "bg-emerald-500" : "bg-amber-500"}`} />
              {status ? (status.live ? "Live AI" : "Demo mode") : "…"}
            </span>
            <button onClick={() => setTour(true)} className="btn btn-sm btn-ghost hidden sm:inline-flex" title="Auto-play product tour">
              ▶ Tour
            </button>
            <button onClick={() => setShowSettings(true)} className="btn btn-sm" title="Integrations & settings">
              {integration ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
              ⚙ <span className="hidden sm:inline">Integrations</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
        <div key={tab} className="fade-in">
          {tab === "capture" && (
            <Capture
              state={state}
              status={status}
              onDraft={(d) => {
                setDraft(d);
                update((s) =>
                  log(s, `Processed "${d.result.title}": ${d.result.decisions.length} decisions, ${d.result.action_items.length} action items, ${d.result.conflicts.length} conflict(s) with memory.`)
                );
                setTab("review");
              }}
            />
          )}
          {tab === "review" &&
            (draft ? (
              <Review
                draft={draft}
                setDraft={setDraft}
                state={state}
                onDiscard={() => {
                  setDraft(null);
                  setTab("capture");
                }}
                onCommit={(next, msg) => {
                  update(() => next);
                  setDraft(null);
                  setToast(msg);
                  setTab("tracker");
                }}
              />
            ) : (
              <Empty
                icon="✅"
                title="Nothing waiting for approval"
                body="Capture a meeting first. The agent drafts decisions, owners and deadlines here, and nothing is sent anywhere until you approve it."
                action={() => setTab("capture")}
                actionLabel="Capture a meeting"
              />
            ))}
          {tab === "tracker" && <Tracker state={state} update={update} setToast={setToast} />}
          {tab === "memory" && <Memory state={state} />}
          {tab === "digest" && <Digest state={state} update={update} setToast={setToast} />}
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-8 text-center text-xs text-slate-400">
        Built voice-first with Wispr Flow · Agentic AI Hackathon &apos;26
      </footer>

      {showSettings && (
        <Settings
          state={state}
          update={update}
          onClose={() => setShowSettings(false)}
          setToast={setToast}
          onReset={() => {
            reset();
            setDraft(null);
            setShowSettings(false);
            setTab("capture");
            setToast("Demo data reset");
          }}
        />
      )}

      {tour && (
        <Tour
          onStart={() => {
            reset();
            setDraft(null);
            setShowSettings(false);
            setTab("capture");
          }}
          onEnd={() => setTour(false)}
        />
      )}

      {toast && (
        <div className={`fade-in fixed ${tour ? "top-24" : "bottom-6"} left-1/2 z-[86] -translate-x-1/2 rounded-2xl bg-slate-900/95 px-4 py-2.5 text-sm font-medium text-white shadow-2xl ring-1 ring-white/10`}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════ Capture ═════════════════════════ */

function Capture({ state, status, onDraft }: { state: State; status: Status | null; onDraft: (d: Draft) => void }) {
  const [text, setText] = useState("");
  const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recRef = useRef<any>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => recRef.current?.stop(), []);
  useEffect(() => {
    // Guided demo: /app?demo=1 pre-loads the messy sample meeting
    if (new URLSearchParams(window.location.search).get("demo") === "1") {
      setText(SAMPLE_TRANSCRIPT);
      window.history.replaceState(null, "", "/app");
    }
  }, []);

  async function run() {
    setErr(null);
    setBusy(true);
    setStep(0);
    const iv = setInterval(() => setStep((s) => Math.min(s + 1, AGENT_STEPS.length - 1)), 1600);
    try {
      const r = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: text,
          meetingDate: date,
          memory: state.decisions,
          openTasks: state.tasks.filter((t) => t.status !== "done").map((t) => ({ task: t.task, owner: t.owner, deadline: t.deadline })),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      const result: ExtractResult = j.result;
      onDraft({
        result,
        items: result.action_items.map((a) => ({ ...a, include: a.confidence !== "low", _id: uid() })),
        decisionInclude: result.decisions.map(() => true),
        conflictChoice: Object.fromEntries(result.conflicts.map((_, i) => [i, "supersede"])),
        transcript: text,
        date,
      });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      clearInterval(iv);
      setBusy(false);
    }
  }

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setErr("This browser has no built-in speech recognition. Use Wispr Flow: click the box and hold Caps Lock.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-IN";
    rec.onresult = (e: any) => {
      let chunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) chunk += e.results[i][0].transcript + " ";
      if (chunk.trim()) setText((t) => (t ? t.trimEnd() + " " : "") + chunk.trim());
    };
    rec.onerror = (e: any) => {
      setErr(`Mic error: ${e.error}`);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
    setErr(null);
  }

  async function onFile(f: File) {
    setErr(null);
    if (f.type.startsWith("audio/") || f.type.startsWith("video/") || /\.(mp3|m4a|wav|webm|ogg|mp4|flac|mpeg|mpga)$/i.test(f.name)) {
      setTranscribing(true);
      try {
        const fd = new FormData();
        fd.append("file", f);
        const r = await fetch("/api/transcribe", { method: "POST", body: fd });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setText(j.text);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setTranscribing(false);
      }
      return;
    }
    const raw = await f.text();
    const cleaned = raw
      .split(/\r?\n/)
      .filter((l) => !/^WEBVTT|^NOTE|^\d+$|-->/.test(l.trim()))
      .join("\n")
      .replace(/<v ([^>]+)>/g, "$1: ")
      .replace(/<\/v>/g, "")
      .replace(/\n{3,}/g, "\n\n");
    setText(cleaned.trim());
  }

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const active = busy || listening || transcribing;
  const openTasks = state.tasks.filter((t) => t.status !== "done").length;
  const activeDecisions = state.decisions.filter((d) => d.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Tilt className="glass relative overflow-hidden p-6 sm:p-8" max={3}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <span className="chip bg-violet-100/80 text-violet-700 ring-1 ring-violet-200">🎙 Voice-first · Wispr Flow</span>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Turn spoken meetings into <span className="text-gradient">shipped work.</span>
            </h1>
            <p className="mt-2 max-w-xl text-slate-600">
              Talk through what happened. The agent attributes speakers, extracts decisions and owners, resolves deadlines, catches reversals of past decisions, and executes once you approve.
            </p>
            <div className="mt-5 grid max-w-md grid-cols-3 gap-3">
              <Stat n={activeDecisions} label="Decisions in memory" />
              <Stat n={openTasks} label="Open tasks" />
              <Stat n={state.meetings.length} label="Meetings" />
            </div>
          </div>
          <div className="orb-wrap relative mx-auto hidden h-44 w-44 md:block">
            <div className={`orb h-44 w-44 ${active ? "active" : ""}`} />
            <div className="orb-ring" />
            <div className="orb-ring r2" />
            <div className="absolute inset-0 grid place-items-center text-white">
              {active ? (
                <div className="bars flex h-4 items-center">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              ) : (
                <span className="text-3xl drop-shadow">🎙</span>
              )}
            </div>
          </div>
        </div>
      </Tilt>

      <div className="grid gap-6 lg:grid-cols-[1fr_330px]">
        <section className="glass p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Capture a meeting</h2>
            <label className="ml-auto flex items-center gap-2 text-sm text-slate-500">
              Meeting date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value || todayISO())} className="field py-1" />
            </label>
          </div>

          <div className="relative">
            <textarea
              data-tour="input"
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Click here, hold Caps Lock (Wispr Flow) and just talk…\n\n"Okay so in today's sync Priya said we're pushing launch to the 22nd… Rahul's gonna update the pricing page by Friday… someone needs to tell support…"\n\nOr paste a transcript (Zoom / Meet / Otter / Wispr Notetaker), drop a .txt / .vtt file, or upload an audio recording.`}
              className={`field h-80 w-full resize-y p-4 font-mono text-[13px] leading-relaxed ${transcribing ? "shimmer" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) onFile(f);
              }}
              disabled={transcribing}
            />
            <div className="pointer-events-none absolute bottom-3 right-4 text-xs text-slate-400">{words} words</div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setText(SAMPLE_TRANSCRIPT);
                setErr(null);
              }}
              className="btn btn-sm"
            >
              ✨ Load messy sample
            </button>
            <label className="btn btn-sm">
              {transcribing ? "🎧 Transcribing…" : "📎 Upload file / audio"}
              <input
                type="file"
                accept=".txt,.vtt,.srt,.md,audio/*,video/mp4,.m4a,.mp3,.wav,.webm"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <button onClick={toggleMic} className={`btn btn-sm ${listening ? "!border-rose-300 !bg-rose-50 !text-rose-700" : ""}`}>
              {listening ? (
                <>
                  <span className="bars flex h-3 items-center text-rose-500">
                    <span />
                    <span />
                    <span />
                  </span>
                  Stop
                </>
              ) : (
                "🎤 Browser mic"
              )}
            </button>
            {text && (
              <button onClick={() => setText("")} className="btn btn-sm btn-ghost text-slate-500">
                Clear
              </button>
            )}
            <button data-tour="run" disabled={!text.trim() || busy || transcribing} onClick={run} className={`btn btn-primary ml-auto px-5 py-2.5 ${text === SAMPLE_TRANSCRIPT && !busy ? "animate-pulse" : ""}`}>
              {busy ? "Agent working…" : "Run agent →"}
            </button>
          </div>
          {err && <div className="fade-in mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{err}</div>}
          {status && !status.live && (
            <p className="mt-3 text-xs text-amber-700">Demo mode: only the bundled sample meeting can be processed. Add GROQ_API_KEY to process your own meetings.</p>
          )}
        </section>

        <aside className="space-y-4">
          <Tilt className="glass p-5" max={5}>
            <div className="eyebrow mb-3 !text-violet-700">Voice workflow</div>
            <ol className="space-y-3 text-sm text-slate-700">
              {[
                ["Speak the meeting", <>Hold <span className="kbd">Caps Lock</span> and ramble: who said what, what was agreed, who&apos;s on it.</>],
                ["Agent structures it", "Speakers, decisions, owners and real dates, checked against memory."],
                ["Fix it by voice", "“Give that to Rahul, due Monday.” No forms."],
                ["Approve → executes", "Tracker, Slack/Discord/Zapier, calendar, reminders, digest."],
              ].map(([t, d], i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-b from-violet-500 to-indigo-600 text-xs font-bold text-white shadow-[0_2px_0_#3730a3]">{i + 1}</span>
                  <span>
                    <b className="block text-slate-900">{t}</b>
                    {d}
                  </span>
                </li>
              ))}
            </ol>
          </Tilt>
          <div className="glass p-5">
            <div className="eyebrow mb-3">Agent pipeline</div>
            <ol className="space-y-2 text-sm">
              {AGENT_STEPS.map((s, i) => {
                const st = !busy ? "idle" : i < step ? "done" : i === step ? "active" : "idle";
                return (
                  <li key={s} className="flex items-center gap-2.5">
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold transition ${
                        st === "done" ? "bg-emerald-500 text-white" : st === "active" ? "animate-pulse bg-indigo-600 text-white ring-4 ring-indigo-100" : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {st === "done" ? "✓" : i + 1}
                    </span>
                    <span className={st === "active" ? "font-medium text-indigo-700" : st === "done" ? "text-slate-500" : "text-slate-600"}>{s}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ═════════════════════════ Review (human-in-the-loop) ═════════════════════════ */

function Review({
  draft,
  setDraft,
  state,
  onCommit,
  onDiscard,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  state: State;
  onCommit: (s: State, msg: string) => void;
  onDiscard: () => void;
}) {
  const r = draft.result;
  const [cmd, setCmd] = useState("");
  const [cmdBusy, setCmdBusy] = useState(false);
  const [cmdReply, setCmdReply] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [pushing, setPushing] = useState(false);

  const included = draft.items.filter((i) => i.include);
  const people = useMemo(
    () => [...new Set([...r.speakers.map((s) => s.name), ...draft.items.map((i) => i.owner), ...state.tasks.map((t) => t.owner)])].filter((n) => n && n !== "Unassigned"),
    [r, draft.items, state.tasks]
  );
  const integration = webhookKind(state.settings.webhook);

  function setItem(id: string, patch: Partial<DraftItem>) {
    setDraft({ ...draft, items: draft.items.map((i) => (i._id === id ? { ...i, ...patch } : i)) });
  }

  async function applyCommand() {
    if (!cmd.trim() || cmdBusy) return;
    setCmdBusy(true);
    setCmdReply(null);
    try {
      const res = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: cmd, items: draft.items.map(stripDraft), today: draft.date }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setDraft({ ...draft, items: j.result.action_items.map((a: ActionItemT) => ({ ...a, include: true, _id: uid() })) });
      setCmdReply(j.result.reply);
      setCmd("");
    } catch (e: any) {
      setCmdReply("⚠ " + e.message);
    } finally {
      setCmdBusy(false);
    }
  }

  const keptDecisions = r.decisions.filter((d, i) => draft.decisionInclude[i] && !isDroppedByConflict(d.text, r, draft));
  const slackText = buildRecap(r.title, draft.date, keptDecisions.map((d) => d.text), included);

  async function commit() {
    setPushing(true);
    const meetingId = uid();
    let s: State = { ...state };
    s.meetings = [{ id: meetingId, title: r.title, date: draft.date, summary: r.summary, transcript: draft.transcript }, ...s.meetings];

    const newDecs: MemDecision[] = keptDecisions.map((d) => ({
      id: uid(),
      text: d.text,
      topic: d.topic.toLowerCase(),
      made_by: d.made_by,
      meeting: r.title,
      meetingId,
      date: draft.date,
      status: "active" as const,
    }));
    let decisions = [...s.decisions];
    let superseded = 0;
    r.conflicts.forEach((c, i) => {
      if (draft.conflictChoice[i] !== "supersede") return;
      decisions = decisions.map((d) => {
        if (d.id === c.past_decision_id && d.status === "active") {
          superseded++;
          return { ...d, status: "superseded", supersededBy: c.new_decision };
        }
        return d;
      });
    });
    s.decisions = [...newDecs, ...decisions];

    const tasks: Task[] = included.map((a) => ({ ...stripDraft(a), id: uid(), status: "todo", meetingId, meeting: r.title, createdAt: draft.date }));
    s.tasks = [...tasks, ...s.tasks];
    s = log(s, `You approved ${tasks.length} task(s) and ${newDecs.length} decision(s) from "${r.title}".`, "human");
    if (superseded) s = log(s, `Superseded ${superseded} past decision(s) in memory.`);

    let msg = `✓ ${tasks.length} tasks added to tracker`;
    const res = await push(state.settings.webhook, slackText, "meeting_approved", tasks);
    if (res.mode !== "simulated") {
      if (res.error) {
        s = log(s, `Integration failed: ${res.error}`, "integration");
        msg += ` · ${res.error}`;
      } else {
        s = log(s, `Posted recap + ${tasks.length} task(s) to ${label(res.mode)}.`, "integration");
        msg += ` · sent to ${label(res.mode)}`;
      }
    }
    setPushing(false);
    onCommit(s, msg);
  }

  const unassigned = included.filter((i) => !i.owner || i.owner === "Unassigned").length;

  return (
    <div className="space-y-5">
      <section className="glass p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <span className="chip bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">● Draft · awaiting your approval</span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{r.title}</h1>
            <p className="mt-1 max-w-3xl text-slate-600">{r.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {r.speakers.map((s) => (
                <span key={s.name} className="chip bg-white text-slate-700 ring-1 ring-slate-200">
                  <Avatar name={s.name} />
                  <b>{s.name}</b>
                  {s.role_guess ? <span className="text-slate-400">· {s.role_guess}</span> : null}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button data-tour="transcript" onClick={() => setShowTranscript((v) => !v)} className="btn btn-sm">
              {showTranscript ? "Hide" : "Messy → clean"} transcript
            </button>
            <button onClick={() => confirm("Discard this draft?") && onDiscard()} className="btn btn-sm btn-ghost text-slate-500">
              Discard
            </button>
          </div>
        </div>
        {showTranscript && (
          <div className="fade-in mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <div className="eyebrow mb-1">Raw input</div>
              <div className="max-h-80 overflow-auto rounded-xl bg-slate-900/[0.03] p-3 font-mono text-xs whitespace-pre-wrap text-slate-500 ring-1 ring-slate-200">{draft.transcript}</div>
            </div>
            <div>
              <div className="eyebrow mb-1 !text-emerald-700">Cleaned & attributed</div>
              <div className="max-h-80 space-y-2 overflow-auto rounded-xl bg-emerald-50/60 p-3 text-sm ring-1 ring-emerald-200">
                {r.clean_transcript.map((l, i) => (
                  <p key={i}>
                    <b className="text-emerald-800">{l.speaker}:</b> {l.text}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {r.conflicts.length > 0 && (
        <section data-tour="conflicts" className="glass !border-rose-200 p-5 ring-2 ring-rose-200/70">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-[0_2px_0_#9f1239]">!</span>
            <div>
              <h2 className="font-semibold text-rose-800">
                {r.conflicts.length} conflict{r.conflicts.length > 1 ? "s" : ""} with past decisions
              </h2>
              <p className="text-sm text-rose-700/80">These contradict what the team agreed earlier. Decide how memory should be updated.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {r.conflicts.map((c, i) => (
              <Tilt key={i} max={4} className="rounded-2xl border border-rose-100 bg-white p-4 shadow-[0_10px_30px_-18px_rgba(225,29,72,.5)]">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">{c.past_meeting}</span>
                  <span className={`chip ${c.severity === "high" ? "bg-rose-100 text-rose-700" : c.severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                    {c.severity}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-400 line-through decoration-rose-400">{c.past_decision}</div>
                <div className="text-[15px] font-semibold">→ {c.new_decision}</div>
                <p className="mt-2 text-sm text-slate-600">{c.explanation}</p>
                <p className="mt-1 text-sm text-slate-500">💡 {c.suggested_resolution}</p>
                <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-900/[0.04] p-1 text-xs font-medium">
                  {(
                    [
                      ["supersede", "Accept new"],
                      ["keep", "Keep old"],
                    ] as const
                  ).map(([k, lbl]) => (
                    <button
                      key={k}
                      onClick={() => setDraft({ ...draft, conflictChoice: { ...draft.conflictChoice, [i]: k } })}
                      className={`rounded-lg px-2 py-1.5 transition ${draft.conflictChoice[i] === k ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </Tilt>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <section data-tour="items" className="glass p-5">
          <div className="mb-3 flex items-center">
            <h2 className="font-semibold">Action items</h2>
            <span className="ml-2 text-sm text-slate-400">
              {included.length}/{draft.items.length} selected
            </span>
            <button
              onClick={() => setDraft({ ...draft, items: [...draft.items, { task: "New task", owner: "Unassigned", deadline: null, deadline_phrase: null, priority: "medium", source_quote: "", confidence: "high", include: true, _id: uid() }] })}
              className="btn btn-sm ml-auto"
            >
              + Add
            </button>
          </div>
          <datalist id="people">
            {people.map((p) => (
              <option key={p} value={p} />
            ))}
            <option value="Unassigned" />
          </datalist>
          <div className="space-y-2">
            {draft.items.map((it) => {
              const noOwner = !it.owner || it.owner === "Unassigned";
              return (
                <div key={it._id} className={`lift rounded-2xl border bg-white/90 p-3 ${it.include ? "border-slate-200" : "border-dashed border-slate-200 opacity-50"}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={it.include} onChange={(e) => setItem(it._id, { include: e.target.checked })} className="mt-2 h-4 w-4 accent-indigo-600" />
                    <div className="min-w-0 flex-1">
                      <input
                        value={it.task}
                        onChange={(e) => setItem(it._id, { task: e.target.value })}
                        className="w-full rounded-lg border border-transparent px-1.5 py-0.5 font-medium hover:border-slate-200 focus:border-indigo-400 focus:outline-none"
                      />
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                        <div className={`flex items-center gap-1 rounded-lg px-1 ${noOwner ? "bg-amber-50 ring-1 ring-amber-300" : ""}`}>
                          <Avatar name={it.owner || "Unassigned"} />
                          <input
                            list="people"
                            value={it.owner}
                            onChange={(e) => setItem(it._id, { owner: e.target.value })}
                            onFocus={(e) => noOwner && e.target.select()}
                            className="w-28 bg-transparent px-1 py-0.5 outline-none"
                            placeholder="Owner"
                          />
                        </div>
                        <input
                          type="date"
                          value={it.deadline ?? ""}
                          onChange={(e) => setItem(it._id, { deadline: e.target.value || null })}
                          className={`field py-0.5 ${!it.deadline ? "!border-amber-300 !bg-amber-50" : ""}`}
                        />
                        {it.deadline_phrase && <span className="text-xs text-slate-400">“{it.deadline_phrase}”</span>}
                        <select value={it.priority} onChange={(e) => setItem(it._id, { priority: e.target.value as any })} className="field py-0.5">
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                        <ConfidenceChip c={it.confidence} />
                        <button onClick={() => setDraft({ ...draft, items: draft.items.filter((x) => x._id !== it._id) })} className="ml-auto text-xs text-slate-400 hover:text-rose-600" title="Remove">
                          ✕
                        </button>
                      </div>
                      {it.source_quote && (
                        <div className="mt-1.5 truncate text-xs italic text-slate-400" title={it.source_quote}>
                          “{it.source_quote}”
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {!draft.items.length && <p className="py-6 text-center text-sm text-slate-400">No action items. Add one, or fix it by voice below.</p>}
          </div>

          <div className="mt-4 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 p-3 ring-1 ring-violet-200">
            <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-violet-800">
              🎙 Fix it by voice <span className="text-xs font-normal text-violet-500">· hold Caps Lock and say what to change</span>
            </div>
            <div className="flex gap-2">
              <input
                data-tour="cmd"
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyCommand()}
                placeholder="“Give the support briefing to Rahul, due Monday, and make the press kit high priority”"
                className="field flex-1"
              />
              <button data-tour="apply" onClick={applyCommand} disabled={cmdBusy || !cmd.trim()} className="btn btn-primary">
                {cmdBusy ? "Applying…" : "Apply"}
              </button>
            </div>
            {cmdReply && <div data-tour="cmd-reply" className="fade-in mt-2 text-sm text-violet-900">🤖 {cmdReply}</div>}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="glass p-5">
            <h2 className="mb-3 font-semibold">Decisions</h2>
            <div className="space-y-2.5">
              {r.decisions.map((d, i) => {
                const dropped = isDroppedByConflict(d.text, r, draft);
                return (
                  <label key={i} className={`flex gap-2.5 text-sm ${dropped ? "opacity-40" : ""}`}>
                    <input
                      type="checkbox"
                      checked={draft.decisionInclude[i] && !dropped}
                      disabled={dropped}
                      onChange={(e) => setDraft({ ...draft, decisionInclude: draft.decisionInclude.map((v, j) => (j === i ? e.target.checked : v)) })}
                      className="mt-1 accent-indigo-600"
                    />
                    <span>
                      <b className={dropped ? "line-through" : ""}>{d.text}</b>
                      <span className="block text-xs text-slate-500">
                        {d.made_by}
                        {d.rationale ? ` · ${d.rationale}` : ""}
                        {dropped ? " · dropped (kept old)" : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
              {!r.decisions.length && <p className="text-sm text-slate-400">No firm decisions detected.</p>}
            </div>
          </section>
          {(r.warnings.length > 0 || r.open_questions.length > 0) && (
            <section className="glass p-5 ring-1 ring-amber-200">
              <h2 className="mb-2 font-semibold text-amber-900">⚠ Needs a human</h2>
              <ul className="space-y-1.5 text-sm text-amber-900">
                {r.warnings.map((w, i) => (
                  <li key={i} className="flex gap-2">
                    <span>•</span>
                    {w}
                  </li>
                ))}
                {r.open_questions.map((q, i) => (
                  <li key={"q" + i} className="flex gap-2">
                    <span>?</span>
                    <span>
                      <i>Open question:</i> {q}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <button data-tour="approve" onClick={() => setShowConfirm(true)} disabled={!included.length && !keptDecisions.length} className="btn btn-primary px-6 py-3 text-base">
          Review & approve {included.length} task{included.length === 1 ? "" : "s"} →
        </button>
      </div>

      {showConfirm && (
        <Modal onClose={() => !pushing && setShowConfirm(false)} title="Confirm before anything executes">
          <p className="text-sm text-slate-600">The agent will do exactly this. Nothing is sent until you confirm.</p>
          <ul className="my-3 space-y-1.5 text-sm">
            <li>📋 Create <b>{included.length}</b> task(s) in the tracker</li>
            <li>🧠 Save <b>{keptDecisions.length}</b> decision(s) to memory</li>
            {r.conflicts.some((_, i) => draft.conflictChoice[i] === "supersede") && (
              <li>
                ♻️ Supersede <b>{r.conflicts.filter((_, i) => draft.conflictChoice[i] === "supersede").length}</b> past decision(s)
              </li>
            )}
            <li>{integration ? <>💬 Post this recap to <b>{label(integration)}</b>:</> : <>💬 No integration connected, so the recap below is only a preview (connect one under ⚙ Integrations)</>}</li>
          </ul>
          <pre className="max-h-56 overflow-auto rounded-xl bg-slate-900 p-3 text-xs whitespace-pre-wrap text-slate-100">{slackText}</pre>
          {unassigned > 0 && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">⚠ {unassigned} task(s) still have no owner.</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowConfirm(false)} disabled={pushing} className="btn">
              Back to edit
            </button>
            <button data-tour="confirm" onClick={commit} disabled={pushing} className="btn btn-primary">
              {pushing ? "Executing…" : "Confirm & execute"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function stripDraft(a: DraftItem): ActionItemT {
  return { task: a.task, owner: a.owner?.trim() || "Unassigned", deadline: a.deadline, deadline_phrase: a.deadline_phrase, priority: a.priority, source_quote: a.source_quote, confidence: a.confidence };
}

function isDroppedByConflict(text: string, r: ExtractResult, draft: Draft) {
  return r.conflicts.some((c, i) => c.new_decision === text && draft.conflictChoice[i] === "keep");
}

function buildRecap(title: string, date: string, decisions: string[], items: ActionItemT[]) {
  return [
    `*📝 ${title}* (${fmtDate(date)})`,
    decisions.length ? `\n*Decisions*\n${decisions.map((d) => `• ${d}`).join("\n")}` : "",
    items.length ? `\n*Action items*\n${items.map((i) => `• ${i.task} → *${i.owner || "Unassigned"}*${i.deadline ? ` (due ${fmtDate(i.deadline)})` : ""}`).join("\n")}` : "",
    `\n_Sent by FollowThrough after human approval_`,
  ]
    .filter(Boolean)
    .join("\n");
}

/* ═════════════════════════ Tracker ═════════════════════════ */

function getReminders(tasks: Task[]) {
  const today = todayISO();
  const soon = addDays(today, 2);
  const open = tasks.filter((t) => t.status !== "done" && t.deadline);
  return {
    overdue: open.filter((t) => t.deadline! < today),
    dueSoon: open.filter((t) => t.deadline! >= today && t.deadline! <= soon),
  };
}

function Tracker({ state, update, setToast }: { state: State; update: (fn: (s: State) => State) => void; setToast: (s: string) => void }) {
  const [owner, setOwner] = useState("All");
  const [showNudge, setShowNudge] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [sending, setSending] = useState(false);
  const { overdue, dueSoon } = getReminders(state.tasks);
  const owners = ["All", ...new Set(state.tasks.map((t) => t.owner))];
  const tasks = state.tasks.filter((t) => owner === "All" || t.owner === owner);
  const nudgeTargets = [...overdue, ...dueSoon];
  const today = todayISO();

  const nudgeText = useMemo(() => {
    const byOwner: Record<string, Task[]> = {};
    nudgeTargets.forEach((t) => (byOwner[t.owner] ||= []).push(t));
    return Object.entries(byOwner)
      .map(([o, ts]) => `Hi *${o}*, quick nudge on:\n${ts.map((t) => `• ${t.task}: ${t.deadline! < today ? `*overdue* (was due ${fmtDate(t.deadline!)})` : `due ${fmtDate(t.deadline!)}`}`).join("\n")}`)
      .join("\n\n");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tasks]);

  function move(id: string, status: TaskStatus) {
    update((s) => {
      const t = s.tasks.find((x) => x.id === id);
      if (!t || t.status === status) return s;
      return log({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, status } : x)) }, `"${t.task}" (${t.owner}) → ${colName(status)}`, "human");
    });
  }

  async function sendNudges() {
    setSending(true);
    const res = await push(state.settings.webhook, `⏰ *Deadline reminders*\n\n${nudgeText}`, "reminders", nudgeTargets);
    update((s) =>
      log(s, res.error ? `Reminder send failed: ${res.error}` : `Sent ${nudgeTargets.length} deadline reminder(s)${res.mode === "simulated" ? " (simulated, no integration)" : ` to ${label(res.mode)}`}.`, "integration")
    );
    try {
      if ("Notification" in window && !(window as any).__tour) {
        const p = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
        if (p === "granted") new Notification("FollowThrough: reminders sent", { body: `${nudgeTargets.length} task(s) nudged` });
      }
    } catch {}
    setSending(false);
    setShowNudge(false);
    setToast(res.error ? `⚠ ${res.error}` : res.mode === "simulated" ? "Reminders sent (simulated)" : `Reminders posted to ${label(res.mode)}`);
  }

  function exportIcs() {
    const due = state.tasks.filter((t) => t.deadline && t.status !== "done");
    if (!due.length) return setToast("No open tasks with deadlines");
    const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
    const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FollowThrough//EN", "CALSCALE:GREGORIAN"];
    due.forEach((t) => {
      const d = t.deadline!.replace(/-/g, "");
      const end = addDays(t.deadline!, 1).replace(/-/g, "");
      lines.push(
        "BEGIN:VEVENT",
        `UID:${t.id}@followthrough`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${d}`,
        `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:${esc(`${t.task} (${t.owner})`)}`,
        `DESCRIPTION:${esc(`From meeting: ${t.meeting}`)}`,
        "BEGIN:VALARM",
        "TRIGGER:-P1D",
        "ACTION:DISPLAY",
        "DESCRIPTION:Due tomorrow",
        "END:VALARM",
        "END:VEVENT"
      );
    });
    lines.push("END:VCALENDAR");
    download("followthrough-deadlines.ics", lines.join("\r\n"), "text/calendar");
    update((s) => log(s, `Exported ${due.length} deadline(s) to calendar (.ics).`, "integration"));
  }

  function exportCsv() {
    if (!state.tasks.length) return setToast("No tasks to export");
    const q = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const rows = [["Summary", "Assignee", "Due date", "Priority", "Status", "Meeting", "Source quote"].join(",")];
    state.tasks.forEach((t) => rows.push([t.task, t.owner, t.deadline ?? "", t.priority, colName(t.status), t.meeting, t.source_quote].map(q).join(",")));
    download("followthrough-tasks.csv", rows.join("\n"), "text/csv");
    update((s) => log(s, `Exported ${state.tasks.length} task(s) as CSV (Jira / Linear / Asana import).`, "integration"));
  }

  return (
    <div className="space-y-5">
      {nudgeTargets.length > 0 && (
        <div className="glass fade-in flex flex-wrap items-center gap-3 p-4 ring-1 ring-amber-200">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 text-lg shadow-[0_3px_0_#b45309]">⏰</span>
          <div className="flex-1 text-sm">
            <b className="text-rose-600">{overdue.length} overdue</b> · <b className="text-amber-700">{dueSoon.length} due in 48h</b>
            <div className="text-slate-500">The agent drafted reminders for each owner.</div>
          </div>
          <button data-tour="reminders" onClick={() => setShowNudge(true)} className="btn btn-amber">
            Review reminders
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Tracker</h1>
        <span className="text-sm text-slate-400">Drag cards between columns · click to edit</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <select value={owner} onChange={(e) => setOwner(e.target.value)} className="field">
            {owners.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <button onClick={exportIcs} className="btn btn-sm">
            📅 Calendar (.ics)
          </button>
          <button onClick={exportCsv} className="btn btn-sm">
            ⬇ CSV for Jira/Linear
          </button>
        </div>
      </div>

      <div data-tour="board" className="grid gap-4 md:grid-cols-3">
        {(["todo", "doing", "done"] as TaskStatus[]).map((col) => {
          const colTasks = tasks.filter((t) => t.status === col).sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
          return (
            <div
              key={col}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(col);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) move(id, col);
              }}
              className={`min-h-48 rounded-3xl p-3 transition ${dragOver === col ? "bg-indigo-100/70 ring-2 ring-indigo-300" : "bg-slate-900/[0.035]"}`}
            >
              <div className="mb-2.5 flex items-center justify-between px-1.5">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className={`h-2 w-2 rounded-full ${col === "todo" ? "bg-slate-400" : col === "doing" ? "bg-indigo-500" : "bg-emerald-500"}`} />
                  {colName(col)}
                </span>
                <span className="chip bg-white text-slate-500 shadow-sm">{colTasks.length}</span>
              </div>
              <div className="space-y-2.5">
                {colTasks.map((t) => (
                  <TaskCard key={t.id} t={t} move={move} onOpen={() => setEditing(t)} />
                ))}
                {!colTasks.length && <div className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">Drop here</div>}
              </div>
            </div>
          );
        })}
      </div>

      <ActivityLog state={state} />

      {showNudge && (
        <Modal title="Send these reminders?" onClose={() => !sending && setShowNudge(false)}>
          <pre className="max-h-72 overflow-auto rounded-xl bg-slate-900 p-3 text-xs whitespace-pre-wrap text-slate-100">{nudgeText}</pre>
          <p className="mt-2 text-xs text-slate-500">
            {webhookKind(state.settings.webhook) ? `Will post to ${label(webhookKind(state.settings.webhook)!)}.` : "No integration connected, so the send is simulated and logged."}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowNudge(false)} disabled={sending} className="btn">
              Cancel
            </button>
            <button data-tour="send-reminders" onClick={sendNudges} disabled={sending} className="btn btn-amber">
              {sending ? "Sending…" : "Confirm & send"}
            </button>
          </div>
        </Modal>
      )}

      {editing && (
        <TaskEditor
          task={editing}
          people={[...new Set(state.tasks.map((t) => t.owner))]}
          onClose={() => setEditing(null)}
          onSave={(t) => {
            update((s) => log({ ...s, tasks: s.tasks.map((x) => (x.id === t.id ? t : x)) }, `Edited task "${t.task}".`, "human"));
            setEditing(null);
            setToast("Task updated");
          }}
          onDelete={(t) => {
            update((s) => log({ ...s, tasks: s.tasks.filter((x) => x.id !== t.id) }, `Deleted task "${t.task}".`, "human"));
            setEditing(null);
            setToast("Task deleted");
          }}
        />
      )}
    </div>
  );
}

function TaskCard({ t, move, onOpen }: { t: Task; move: (id: string, s: TaskStatus) => void; onOpen: () => void }) {
  const today = todayISO();
  const overdue = t.status !== "done" && t.deadline && t.deadline < today;
  const soon = t.status !== "done" && t.deadline && !overdue && t.deadline <= addDays(today, 2);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", t.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onOpen}
      className={`lift group cursor-grab rounded-2xl border bg-white p-3.5 shadow-[0_1px_0_#fff_inset,0_6px_16px_-10px_rgba(15,23,42,.35)] active:cursor-grabbing ${
        overdue ? "border-rose-300" : "border-slate-200/80"
      }`}
    >
      <div className={`text-sm font-medium leading-snug ${t.status === "done" ? "text-slate-400 line-through" : ""}`}>{t.task}</div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
        <Avatar name={t.owner} />
        <span className={t.owner === "Unassigned" ? "font-medium text-amber-700" : "text-slate-600"}>{t.owner}</span>
        {t.deadline && (
          <span className={`chip ${overdue ? "bg-rose-100 text-rose-700" : soon ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
            {overdue ? "Overdue · " : ""}
            {fmtDate(t.deadline)}
          </span>
        )}
        {t.priority === "high" && <span className="chip bg-rose-50 text-rose-600">High</span>}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span className="truncate">{t.meeting}</span>
        <span className="flex gap-0.5 opacity-60 transition group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          {t.status !== "todo" && (
            <button onClick={() => move(t.id, t.status === "done" ? "doing" : "todo")} className="rounded-md px-1.5 py-0.5 hover:bg-slate-100" title="Move back">
              ←
            </button>
          )}
          {t.status !== "done" && (
            <button onClick={() => move(t.id, t.status === "todo" ? "doing" : "done")} className="rounded-md px-1.5 py-0.5 hover:bg-slate-100" title="Move forward">
              →
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

function TaskEditor({ task, people, onClose, onSave, onDelete }: { task: Task; people: string[]; onClose: () => void; onSave: (t: Task) => void; onDelete: (t: Task) => void }) {
  const [t, setT] = useState<Task>(task);
  const gcal = t.deadline
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${t.task} (${t.owner})`)}&dates=${t.deadline.replace(/-/g, "")}/${addDays(t.deadline, 1).replace(/-/g, "")}&details=${encodeURIComponent(`From meeting: ${t.meeting}`)}`
    : null;
  return (
    <Modal title="Edit task" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="eyebrow">Task</span>
          <input value={t.task} onChange={(e) => setT({ ...t, task: e.target.value })} className="field mt-1 w-full" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="eyebrow">Owner</span>
            <input list="tracker-people" value={t.owner} onChange={(e) => setT({ ...t, owner: e.target.value })} className="field mt-1 w-full" />
            <datalist id="tracker-people">
              {people.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm">
            <span className="eyebrow">Deadline</span>
            <input type="date" value={t.deadline ?? ""} onChange={(e) => setT({ ...t, deadline: e.target.value || null })} className="field mt-1 w-full" />
          </label>
          <label className="block text-sm">
            <span className="eyebrow">Priority</span>
            <select value={t.priority} onChange={(e) => setT({ ...t, priority: e.target.value as any })} className="field mt-1 w-full">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="eyebrow">Status</span>
            <select value={t.status} onChange={(e) => setT({ ...t, status: e.target.value as TaskStatus })} className="field mt-1 w-full">
              <option value="todo">To do</option>
              <option value="doing">In progress</option>
              <option value="done">Done</option>
            </select>
          </label>
        </div>
        {t.source_quote && <p className="rounded-xl bg-slate-50 p-2.5 text-xs italic text-slate-500 ring-1 ring-slate-200">“{t.source_quote}” · {t.meeting}</p>}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button onClick={() => confirm("Delete this task?") && onDelete(t)} className="btn btn-sm btn-ghost text-rose-600">
          Delete
        </button>
        {gcal && (
          <a href={gcal} target="_blank" rel="noreferrer" className="btn btn-sm">
            + Google Calendar
          </a>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={onClose} className="btn">
            Cancel
          </button>
          <button onClick={() => onSave({ ...t, task: t.task.trim() || task.task, owner: t.owner.trim() || "Unassigned" })} className="btn btn-primary">
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ActivityLog({ state }: { state: State }) {
  return (
    <section data-tour="log" className="glass p-5">
      <div className="eyebrow mb-3">Agent activity log</div>
      <ul className="max-h-64 space-y-2 overflow-auto text-sm">
        {state.log.map((l, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="w-12 shrink-0 pt-0.5 text-xs tabular-nums text-slate-400">{new Date(l.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <span
              className={`chip shrink-0 ${l.kind === "agent" ? "bg-indigo-50 text-indigo-700" : l.kind === "human" ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-700"}`}
            >
              {l.kind === "agent" ? "Agent" : l.kind === "human" ? "You" : "Integration"}
            </span>
            <span className="text-slate-700">{l.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ═════════════════════════ Memory ═════════════════════════ */

function Memory({ state }: { state: State }) {
  const topics = [...new Set(state.decisions.map((d) => d.topic))];
  const [open, setOpen] = useState<Meeting | null>(null);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <section data-tour="memory" className="glass p-5 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Decision memory</h1>
        <p className="mb-5 text-sm text-slate-500">Every new meeting is checked against active decisions. Superseded decisions keep their history, so you always know what changed and when.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {topics.map((topic) => {
            const ds = state.decisions.filter((d) => d.topic === topic).sort((a, b) => a.date.localeCompare(b.date));
            return (
              <Tilt key={topic} max={4} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_30px_-20px_rgba(30,27,75,.45)]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="eyebrow !text-indigo-600">{topic}</span>
                  {ds.length > 1 && <span className="chip bg-amber-50 text-amber-700">changed {ds.length - 1}×</span>}
                </div>
                <ol className="relative space-y-3 border-l-2 border-slate-100 pl-4">
                  {ds.map((d) => (
                    <li key={d.id} className="relative">
                      <span className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${d.status === "active" ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <div className={`text-sm ${d.status === "superseded" ? "text-slate-400 line-through" : "font-semibold"}`}>{d.text}</div>
                      <div className="text-xs text-slate-500">
                        {fmtDate(d.date)} · {d.meeting} · {d.made_by}
                      </div>
                    </li>
                  ))}
                </ol>
              </Tilt>
            );
          })}
        </div>
      </section>
      <aside className="glass h-fit p-5">
        <h2 className="mb-3 font-semibold">Meetings</h2>
        <ul className="space-y-2">
          {state.meetings.map((m) => (
            <li key={m.id}>
              <button onClick={() => setOpen(m)} className="lift w-full rounded-2xl border border-slate-200/80 bg-white p-3 text-left">
                <div className="flex items-center justify-between gap-2">
                  <b className="text-sm">{m.title}</b>
                  <span className="shrink-0 text-xs text-slate-400">{fmtDate(m.date)}</span>
                </div>
                <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{m.summary}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      {open && (
        <Modal title={open.title} onClose={() => setOpen(null)}>
          <p className="text-sm text-slate-600">{open.summary}</p>
          <div className="eyebrow mb-1 mt-3">Transcript</div>
          <pre className="max-h-72 overflow-auto rounded-xl bg-slate-50 p-3 font-mono text-xs whitespace-pre-wrap text-slate-600 ring-1 ring-slate-200">{open.transcript}</pre>
          <div className="mt-3 text-xs text-slate-500">
            {state.tasks.filter((t) => t.meetingId === open.id).length} task(s) · {state.decisions.filter((d) => d.meetingId === open.id).length} decision(s) from this meeting
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═════════════════════════ Digest ═════════════════════════ */

function Digest({ state, update, setToast }: { state: State; update: (fn: (s: State) => State) => void; setToast: (s: string) => void }) {
  const [d, setD] = useState<DigestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmPost, setConfirmPost] = useState(false);
  const [posting, setPosting] = useState(false);
  const integration = webhookKind(state.settings.webhook);

  async function gen() {
    setBusy(true);
    setErr(null);
    try {
      const weekAgo = addDays(todayISO(), -7);
      const r = await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          today: todayISO(),
          tasks: state.tasks.map((t) => ({ task: t.task, owner: t.owner, deadline: t.deadline, status: t.status, priority: t.priority })),
          decisions: state.decisions.filter((x) => x.date >= weekAgo).map((x) => ({ text: x.text, date: x.date, meeting: x.meeting, status: x.status })),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setD(j.result);
      update((s) => log(s, "Generated the weekly digest."));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function post() {
    setPosting(true);
    const res = await push(state.settings.webhook, d!.slack_message, "weekly_digest");
    update((s) => log(s, res.error ? `Digest post failed: ${res.error}` : `Weekly digest ${res.mode === "simulated" ? "sent (simulated)" : `posted to ${label(res.mode)}`}.`, "integration"));
    setPosting(false);
    setConfirmPost(false);
    setToast(res.error ? `⚠ ${res.error}` : res.mode === "simulated" ? "Digest sent (simulated)" : `Digest posted to ${label(res.mode)}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Weekly digest</h1>
          <p className="text-sm text-slate-500">What shipped, what slipped, what&apos;s at risk, and who&apos;s carrying what.</p>
        </div>
        <button data-tour="digest-gen" onClick={gen} disabled={busy} className="btn btn-primary ml-auto">
          {busy ? "Writing…" : d ? "↻ Regenerate" : "Generate this week's digest"}
        </button>
      </div>
      {err && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{err}</div>}
      {busy && !d && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="shimmer h-80 rounded-3xl" />
          <div className="shimmer h-80 rounded-3xl" />
        </div>
      )}
      {!d && !busy && <Empty icon="📰" title="Your Monday-morning summary" body="The agent reads every decision and task from the last 7 days and writes a digest you can post to your team channel." />}
      {d && (
        <div data-tour="digest" className="fade-in grid gap-5 lg:grid-cols-2">
          <Tilt max={3} className="glass space-y-4 p-6">
            <h2 className="text-xl font-semibold tracking-tight">{d.headline}</h2>
            <DList title="✅ Highlights" items={d.highlights} />
            <DList title="🧭 Key decisions" items={d.key_decisions} />
            <DList title="🔴 Overdue" items={d.overdue} />
            <DList title="🟠 At risk" items={d.at_risk} />
            <DList title="🎯 Next week" items={d.next_week_focus} />
          </Tilt>
          <section className="space-y-5">
            <div className="glass p-5">
              <h3 className="mb-3 font-semibold">Load by owner</h3>
              <div className="space-y-3">
                {d.by_owner.map((o) => {
                  const pct = (o.done / Math.max(1, o.done + o.open)) * 100;
                  return (
                    <div key={o.owner} className="text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar name={o.owner} />
                        <b>{o.owner}</b>
                        <span className="ml-auto text-xs text-slate-500">
                          {o.done} done · {o.open} open
                        </span>
                      </div>
                      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[inset_0_1px_0_rgba(255,255,255,.5)]" style={{ width: `${pct}%` }} />
                      </div>
                      {o.note && <div className="mt-1 text-xs text-slate-500">{o.note}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="glass p-5">
              <h3 className="mb-2 font-semibold">Ready to post</h3>
              <pre className="max-h-64 overflow-auto rounded-xl bg-slate-900 p-3 text-xs whitespace-pre-wrap text-slate-100">{d.slack_message}</pre>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() =>
                    navigator.clipboard
                      .writeText(d.slack_message)
                      .then(() => setToast("Copied to clipboard"))
                      .catch(() => setToast("Copy failed"))
                  }
                  className="btn btn-sm"
                >
                  Copy
                </button>
                <button onClick={() => setConfirmPost(true)} className="btn btn-sm btn-primary">
                  Post to {integration ? label(integration) : "channel"}…
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
      {confirmPost && (
        <Modal title="Post the weekly digest?" onClose={() => !posting && setConfirmPost(false)}>
          <p className="text-sm text-slate-600">{integration ? `This posts to your ${label(integration)} channel.` : "No integration connected, so the post is simulated and logged."}</p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setConfirmPost(false)} disabled={posting} className="btn">
              Cancel
            </button>
            <button onClick={post} disabled={posting} className="btn btn-primary">
              {posting ? "Posting…" : "Confirm & post"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═════════════════════════ Settings / integrations ═════════════════════════ */

function Settings({
  state,
  update,
  onClose,
  onReset,
  setToast,
}: {
  state: State;
  update: (fn: (s: State) => State) => void;
  onClose: () => void;
  onReset: () => void;
  setToast: (s: string) => void;
}) {
  const [hook, setHook] = useState(state.settings.webhook);
  const [testing, setTesting] = useState(false);
  const kind = webhookKind(hook.trim());
  const invalid = hook.trim() && !kind;

  function save() {
    update((s) => log({ ...s, settings: { ...s.settings, webhook: hook.trim() } }, hook.trim() ? `Connected ${label(kind!)} integration.` : "Integration disconnected.", "integration"));
    setToast(hook.trim() ? `${label(kind!)} connected` : "Integration removed");
    onClose();
  }

  async function test() {
    setTesting(true);
    const res = await push(hook.trim(), "✅ *FollowThrough is connected.* Approved meeting recaps, reminders and weekly digests will appear here.", "test");
    setTesting(false);
    setToast(res.error ? `⚠ ${res.error}` : `Test message sent to ${label(res.mode)}`);
  }

  return (
    <Modal title="Integrations" onClose={onClose}>
      <p className="text-sm text-slate-600">Connect a channel. The agent only posts after you confirm.</p>
      <div className="my-3 grid grid-cols-4 gap-2 text-center text-xs">
        {(["slack", "discord", "zapier", "make"] as const).map((k) => (
          <div key={k} className={`rounded-xl p-2 ring-1 transition ${kind === k ? "bg-indigo-50 ring-indigo-300" : "bg-white ring-slate-200"}`}>
            <div className="text-lg">{k === "slack" ? "💬" : k === "discord" ? "🎮" : k === "zapier" ? "⚡" : "🔗"}</div>
            {label(k)}
          </div>
        ))}
      </div>
      <label className="eyebrow">Webhook URL</label>
      <input value={hook} onChange={(e) => setHook(e.target.value)} placeholder="https://hooks.slack.com/services/…" className={`field mt-1 w-full font-mono text-xs ${invalid ? "!border-rose-400" : ""}`} />
      <p className={`mt-1.5 text-xs ${invalid ? "text-rose-600" : "text-slate-500"}`}>
        {invalid
          ? "Unsupported URL. Use a Slack, Discord, Zapier or Make webhook."
          : kind === "zapier" || kind === "make"
            ? "Receives structured JSON (tasks with owner/deadline). Route it to Trello, Asana, Jira, Notion or Google Tasks."
            : "Slack: Apps → Incoming Webhooks. Discord: Channel → Integrations → Webhooks."}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={() => confirm("Reset all data to the demo seed? This clears your meetings and tasks.") && onReset()} className="btn btn-sm btn-ghost text-rose-600">
          Reset demo data
        </button>
        <div className="ml-auto flex gap-2">
          <button onClick={test} disabled={!kind || testing} className="btn">
            {testing ? "Sending…" : "Send test"}
          </button>
          <button onClick={save} disabled={!!invalid} className="btn btn-primary">
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ═════════════════════════ shared bits ═════════════════════════ */

type IntegrationKind = "slack" | "discord" | "zapier" | "make";

function webhookKind(url: string): IntegrationKind | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    if (u.hostname === "hooks.slack.com") return "slack";
    if ((u.hostname === "discord.com" || u.hostname === "discordapp.com") && u.pathname.startsWith("/api/webhooks/")) return "discord";
    if (u.hostname === "hooks.zapier.com") return "zapier";
    if (/^hook\.[a-z0-9]+\.make\.com$/.test(u.hostname)) return "make";
  } catch {}
  return null;
}

function label(k: string) {
  return ({ slack: "Slack", discord: "Discord", zapier: "Zapier", make: "Make", simulated: "preview" } as Record<string, string>)[k] ?? k;
}

async function push(webhook: string, text: string, event: string, tasks?: unknown[]): Promise<{ mode: string; error?: string }> {
  try {
    const r = await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, event, tasks, webhook: webhook || undefined }),
    });
    const j = await r.json();
    if (!r.ok) return { mode: "error", error: j.error || `HTTP ${r.status}` };
    return { mode: j.mode };
  } catch {
    return { mode: "error", error: "Network error" };
  }
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function colName(s: TaskStatus) {
  return s === "todo" ? "To do" : s === "doing" ? "In progress" : "Done";
}

function Tilt({ children, className = "", max = 6 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`card-3d ${className}`}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(1100px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateZ(0)`;
      }}
      onMouseLeave={() => {
        if (ref.current) ref.current.style.transform = "";
      }}
    >
      {children}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/80 p-3 shadow-[0_1px_0_#fff_inset,0_8px_20px_-14px_rgba(30,27,75,.5)] ring-1 ring-slate-200/70">
      <div className="text-2xl font-semibold tabular-nums tracking-tight">{n}</div>
      <div className="text-[11px] leading-tight text-slate-500">{label}</div>
    </div>
  );
}

function ConfidenceChip({ c }: { c: string }) {
  const cls = c === "high" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : c === "medium" ? "bg-sky-50 text-sky-700 ring-sky-200" : "bg-slate-100 text-slate-600 ring-slate-200";
  return <span className={`chip ring-1 ${cls}`}>{c} confidence</span>;
}

function DList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-1 text-sm font-semibold">{title}</div>
      <ul className="space-y-1 text-sm text-slate-700">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-slate-300">—</span>
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const colors = ["from-indigo-400 to-indigo-600", "from-emerald-400 to-emerald-600", "from-rose-400 to-rose-600", "from-amber-400 to-amber-600", "from-sky-400 to-sky-600", "from-violet-400 to-violet-600"];
  const un = !name || name === "Unassigned";
  const c = un ? "from-slate-300 to-slate-400" : colors[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % colors.length];
  return (
    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gradient-to-b text-[10px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.4)] ${c}`}>
      {un ? "?" : name[0].toUpperCase()}
    </span>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fade-in fixed inset-0 z-40 grid place-items-center bg-slate-900/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass max-h-[90vh] w-full max-w-lg overflow-auto !bg-white/95 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          <button onClick={onClose} className="ml-auto rounded-lg px-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Empty({ icon, title, body, action, actionLabel }: { icon: string; title: string; body: string; action?: () => void; actionLabel?: string }) {
  return (
    <div className="glass p-12 text-center">
      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b from-white to-slate-100 text-2xl shadow-[0_1px_0_#fff_inset,0_10px_24px_-12px_rgba(30,27,75,.4)] ring-1 ring-slate-200">
        {icon}
      </div>
      <div className="text-lg font-semibold">{title}</div>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{body}</p>
      {action && (
        <button onClick={action} className="btn btn-primary mt-5">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
