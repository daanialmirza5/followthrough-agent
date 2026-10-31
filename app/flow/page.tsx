import Link from "next/link";
import FlowDiagram from "@/components/FlowDiagram";

export const metadata = { title: "FollowThrough: agent workflow" };

export default function FlowPage() {
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-8">
      <div className="mb-8 flex flex-wrap items-end gap-4">
        <div>
          <div className="eyebrow !text-violet-700">FollowThrough · agent workflow</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Speech in. <span className="text-gradient">Verified action out.</span>
          </h1>
        </div>
        <Link href="/" className="btn btn-sm ml-auto">
          ← Back
        </Link>
      </div>
      <div className="glass beam p-4 sm:p-8">
        <FlowDiagram />
      </div>
      <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["🎙 Capture", "Wispr Flow dictation, pasted transcripts (.txt/.vtt), or audio through Groq Whisper."],
          ["🧠 Understand + check", "gpt-oss-120b attributes speakers and compares every decision with the decision memory."],
          ["🛡 Draft + validate", "Output is checked against a Zod schema. Malformed output is repaired automatically."],
          ["🛑 Approve → execute", "A human confirms, then tasks, Slack/Discord/Zapier, calendar, reminders and the digest run."],
        ].map(([t, d]) => (
          <div key={t} className="glass p-4">
            <b className="text-slate-900">{t}</b>
            <p className="mt-1">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
