import Link from "next/link";
import FlowDiagram from "@/components/FlowDiagram";

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
        <div className="glass mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="orb-wrap relative h-8 w-8">
              <div className="orb h-8 w-8" style={{ animationDuration: "8s" }} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">FollowThrough</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#architecture" className="hover:text-slate-900">Architecture</a>
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#voice" className="hover:text-slate-900">Voice-first</a>
          </nav>
          <Link href="/app" className="btn btn-primary btn-sm ml-auto md:ml-4">
            Open app →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 md:grid-cols-[1.05fr_1fr] md:pt-20">
        <div className="fade-in">
          <span className="chip bg-violet-100/80 text-violet-700 ring-1 ring-violet-200">🎙 Voice-first meeting agent · powered by Wispr Flow</span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Meetings end.
            <br />
            <span className="text-gradient">Work begins.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-slate-600">
            Say what happened in your meeting. FollowThrough turns messy speech into decisions, owners and deadlines, catches when the team quietly reverses an earlier decision, and executes
            the follow-up once you approve.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/app?demo=1" className="btn btn-primary px-6 py-3 text-base">
              ▶ Try the guided demo
            </Link>
            <Link href="/app?tour=1" className="btn px-6 py-3 text-base">
              ✦ Watch it run itself
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span>✓ Human approval before anything is sent</span>
            <span>✓ Slack · Discord · Zapier · Calendar</span>
          </div>
        </div>

        {/* 3D product preview */}
        <div className="relative [perspective:1400px]">
          <div className="pointer-events-none absolute -inset-10 rounded-full bg-gradient-to-tr from-indigo-400/25 via-violet-400/20 to-sky-300/25 blur-3xl" />
          <div className="hero-3d relative">
            <div className="float-chip -right-4 -top-5 rounded-2xl bg-white px-3 py-2 text-xs font-semibold shadow-[0_18px_40px_-14px_rgba(30,27,75,.5)] ring-1 ring-slate-200 [transform:translateZ(60px)]">
              <span className="text-emerald-600">●</span> Posted to Slack
            </div>
            <div
              className="float-chip -bottom-6 left-6 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-[0_18px_40px_-14px_rgba(15,23,42,.7)] [transform:translateZ(80px)]"
              style={{ animationDelay: "-2s" }}
            >
              “by Friday” → <span className="text-indigo-300">Fri 6 Nov</span>
            </div>
            <div
              className="float-chip -right-8 bottom-24 hidden rounded-2xl bg-gradient-to-b from-violet-500 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_3px_0_#3730a3,0_18px_40px_-14px_rgba(79,70,229,.7)] sm:block"
              style={{ animationDelay: "-4s" }}
            >
              🧠 2 decisions superseded
            </div>
            <div className="glass beam space-y-3 p-5">
              <div className="flex items-center justify-between">
                <span className="chip bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">● Draft · awaiting approval</span>
                <span className="text-xs text-slate-400">Launch re-plan sync</span>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-[0_14px_30px_-18px_rgba(225,29,72,.55)]">
                <div className="flex items-center justify-between">
                  <span className="eyebrow !text-rose-600">⚠ Conflict with past decision</span>
                  <span className="chip bg-rose-100 text-rose-700">high</span>
                </div>
                <div className="mt-2 text-sm text-slate-400 line-through decoration-rose-400">Launch on 15 November</div>
                <div className="font-semibold">→ Launch moves to 22 November</div>
                <div className="mt-1 text-xs text-slate-500">Play Store task (due 8 Nov) is now misaligned.</div>
              </div>
              {[
                ["Update pricing page & FAQ", "Rahul", "Fri 6 Nov", "from-sky-400 to-sky-600"],
                ["Email beta users about new date", "Ananya", "Sun 1 Nov", "from-emerald-400 to-emerald-600"],
                ["Brief the support team", "Unassigned", "No date", "from-slate-300 to-slate-400"],
              ].map(([t, o, d, c]) => (
                <div key={t} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_6px_16px_-12px_rgba(15,23,42,.4)]">
                  <span className="h-4 w-4 rounded border-2 border-indigo-500 bg-indigo-500 shadow-inner" />
                  <span className="flex-1 truncate text-sm font-medium">{t}</span>
                  <span className={`grid h-5 w-5 place-items-center rounded-full bg-gradient-to-b text-[10px] font-bold text-white ${c}`}>{o === "Unassigned" ? "?" : o[0]}</span>
                  <span className={`chip ${o === "Unassigned" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{d}</span>
                </div>
              ))}
              <div className="flex justify-end">
                <span className="btn btn-primary btn-sm">Confirm & execute →</span>
              </div>
            </div>
            <div className="orb-wrap absolute -left-10 -top-10 hidden h-24 w-24 sm:block">
              <div className="orb active h-24 w-24" />
              <div className="orb-ring" />
              <div className="absolute inset-0 grid place-items-center">
                <div className="bars flex h-4 items-center text-white">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <section className="marquee mx-auto max-w-6xl overflow-hidden px-4 pb-16 sm:px-6">
        <div>
          {[0, 1].map((k) => (
            <div key={k} className="flex gap-3 pr-3" aria-hidden={k === 1}>
              {["🎙 Wispr Flow", "⚡ Groq", "🧠 gpt-oss-120b", "🎧 Whisper v3", "💬 Slack", "🎮 Discord", "⚡ Zapier", "🔗 Make", "📅 Google Calendar", "📋 Jira · Linear CSV", "🛡 Zod-validated JSON", "🛑 Human-in-the-loop"].map((t) => (
                <span key={t} className="glass whitespace-nowrap !rounded-full px-4 py-2 text-sm font-medium text-slate-700">
                  {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["🫥", "“Someone should…”", "Action items leave the room without an owner, so nobody does them."],
            ["📆", "“By Friday-ish”", "Relative, vague deadlines never make it into anyone's calendar."],
            ["🔁", "Silent reversals", "This week's call contradicts last week's, and the old tasks keep running."],
          ].map(([i, t, d]) => (
            <div key={t} className="glass lift p-6">
              <div className="text-2xl">{i}</div>
              <div className="mt-3 font-semibold">{t}</div>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20 sm:px-6">
        <div className="eyebrow text-center">How it works</div>
        <h2 className="mt-2 text-center text-3xl font-semibold tracking-tight sm:text-4xl">From voice to done in four steps</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            ["Speak", "Hold Caps Lock (Wispr Flow) and talk through the meeting, or paste a transcript or upload the recording."],
            ["Review", "The agent attributes speakers, extracts decisions, owners and dates, and flags conflicts with memory."],
            ["Execute", "Approve, and tasks land in the tracker and your channel. Old decisions are superseded."],
            ["Follow up", "Deadline reminders go to owners, and a weekly digest shows what slipped and what's at risk."],
          ].map(([t, d], i) => (
            <div key={t} className="glass lift relative p-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-b from-violet-500 to-indigo-600 font-bold text-white shadow-[0_3px_0_#3730a3,0_10px_20px_-8px_rgba(79,70,229,.6)]">
                {i + 1}
              </div>
              <div className="mt-4 text-lg font-semibold">{t}</div>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20 sm:px-6">
        <div className="eyebrow text-center">Under the hood</div>
        <h2 className="mt-2 text-center text-3xl font-semibold tracking-tight sm:text-4xl">The agent workflow</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Speech in, verified action out. Memory-aware conflict checks, schema-validated output with self-repair, and a human gate before anything touches the outside world.
        </p>
        <div className="glass beam mt-10 p-4 sm:p-6">
          <FlowDiagram />
        </div>
        <div className="mt-4 text-center">
          <Link href="/flow" className="text-sm font-medium text-indigo-600 hover:underline">
            Open full-size diagram →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20 sm:px-6">
        <div className="eyebrow text-center">Features</div>
        <h2 className="mt-2 text-center text-3xl font-semibold tracking-tight sm:text-4xl">An agent that actually follows through</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["🗣", "Speaker attribution", "Works out who said what, even from unlabeled dictation, and shows a side-by-side messy → clean transcript."],
            ["🎯", "Owners & real dates", "“By Friday” becomes an actual date. Unowned tasks and vague deadlines are flagged for a human."],
            ["🧠", "Decision memory", "Every decision is remembered by topic, with a full history of what changed and when."],
            ["⚠️", "Conflict detection", "Catches reversals of past decisions, explains the impact, and suggests a resolution."],
            ["🎙", "Edit by voice", "“Give that to Rahul, due Monday.” Change the draft by talking, with no forms."],
            ["🛑", "Human-in-the-loop", "Nothing is posted until you confirm, and you see exactly what will be sent first."],
            ["🔌", "Integrations", "Slack, Discord, Zapier and Make (→ Trello, Asana, Jira), plus CSV and calendar exports."],
            ["⏰", "Deadline reminders", "Finds overdue and due-soon tasks and drafts a nudge for each owner."],
            ["📰", "Weekly digest", "Highlights, overdue, at-risk and load by owner, ready to post."],
          ].map(([i, t, d]) => (
            <div key={t} className="glass lift p-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xl shadow-[0_1px_0_#fff_inset,0_8px_18px_-10px_rgba(30,27,75,.45)] ring-1 ring-slate-200">{i}</div>
              <div className="mt-4 font-semibold">{t}</div>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Voice */}
      <section id="voice" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20 sm:px-6">
        <div className="glass relative overflow-hidden p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl" />
          <div className="relative grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div>
              <div className="eyebrow !text-violet-700">Voice-first with Wispr Flow</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Hold <span className="kbd !text-2xl">Caps Lock</span>. Talk. Done.
              </h2>
              <p className="mt-4 max-w-xl text-slate-600">
                The fastest meeting notes are the ones you speak. Right after the call, ramble for 60 seconds and Wispr Flow types it into FollowThrough, filler words and all. The agent handles
                the rest. This product was itself built by voice: specs, prompts and fixes were all dictated with Wispr Flow.
              </p>
              <Link href="/app?demo=1" className="btn btn-primary mt-6 px-6 py-3">
                ▶ See it on a messy meeting
              </Link>
            </div>
            <div className="orb-wrap relative mx-auto hidden h-40 w-40 md:block">
              <div className="orb active h-40 w-40" />
              <div className="orb-ring" />
              <div className="orb-ring r2" />
              <div className="absolute inset-0 grid place-items-center text-4xl">🎙</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-center text-xs text-slate-400">FollowThrough · Agentic AI Hackathon &apos;26 · Product Space × Wispr Flow</footer>
    </div>
  );
}
