/* Agent workflow diagram. Pure SVG, animated edges, no client JS. */

type Icon = keyof typeof ICONS;
const ICONS = {
  mic: (
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" />
    </>
  ),
  wave: <path d="M2 10v3M6 6v11M10 3v18M14 8v7M18 5v13M22 10v3" />,
  spark: <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />,
  db: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14a8 3 0 0 0 16 0V5M4 12a8 3 0 0 0 16 0" />
    </>
  ),
  alert: <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />,
  list: <path d="M3 7l2 2 4-4M3 17l2 2 4-4M13 6h8M13 12h8M13 18h8" />,
  merge: <path d="M6 6l6 6-6 6M12 6l6 6-6 6" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" />,
  user: (
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M16 11l2 2 4-4" />
    </>
  ),
  send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />,
  bell: <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />,
};

const S = 76; // node size

function Node({ x, y, icon, label, sub, tone = "indigo" }: { x: number; y: number; icon: Icon; label: string; sub?: string; tone?: "indigo" | "rose" | "emerald" | "violet" | "amber" }) {
  const c = { indigo: "#4f46e5", rose: "#e11d48", emerald: "#059669", violet: "#7c3aed", amber: "#d97706" }[tone];
  const bg = { indigo: "#eef2ff", rose: "#fff1f2", emerald: "#ecfdf5", violet: "#f5f3ff", amber: "#fffbeb" }[tone];
  return (
    <g className="fd-node" transform={`translate(${x - S / 2} ${y - S / 2})`}>
      <rect width={S} height={S} rx="16" fill="#fff" filter="url(#fd-shadow)" />
      <rect x="22" y="14" width="32" height="32" rx="9" fill={bg} />
      <g transform="translate(28 20) scale(0.83)" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[icon]}
      </g>
      <text x={S / 2} y="62" textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f172a">
        {label}
      </text>
      {sub && (
        <text x={S / 2} y={S + 16} textAnchor="middle" fontSize="10" fill="#64748b">
          {sub}
        </text>
      )}
    </g>
  );
}

function Edge({ d, color = "#6366f1", label, lx, ly, dashed }: { d: string; color?: string; label?: string; lx?: number; ly?: number; dashed?: boolean }) {
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="2" strokeDasharray={dashed ? "5 5" : undefined} markerEnd={`url(#fd-arrow-${color.slice(1)})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" className="fd-flow" />
      {label && (
        <text x={lx} y={ly} fontSize="10.5" fontWeight="600" fill={color} textAnchor="middle">
          {label}
        </text>
      )}
    </g>
  );
}

export default function FlowDiagram({ className = "" }: { className?: string }) {
  const Y = 150;
  const colors = ["#6366f1", "#e11d48", "#059669", "#7c3aed"];
  return (
    <div className={`overflow-x-auto ${className}`}>
      <svg viewBox="0 0 1460 330" className="min-w-[980px] w-full" role="img" aria-label="FollowThrough agent workflow">
        <defs>
          <filter id="fd-shadow" x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#1e1b4b" floodOpacity="0.16" />
          </filter>
          {colors.map((c) => (
            <marker key={c} id={`fd-arrow-${c.slice(1)}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill={c} />
            </marker>
          ))}
          <linearGradient id="fd-band" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#6366f1" stopOpacity="0.10" />
            <stop offset="1" stopColor="#6366f1" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* stage bands */}
        {[
          [0, 470, 0.5, "1 · CAPTURE & UNDERSTAND"],
          [470, 150, 1.4, "CHECK"],
          [620, 420, 0.8, "2 · DRAFT & VALIDATE"],
          [1040, 150, 1.4, "APPROVE"],
          [1190, 270, 1, "3 · EXECUTE · 4 · FOLLOW UP"],
        ].map(([x, w, o, t]) => (
          <g key={t as string}>
            <rect x={x as number} y="0" width={w as number} height="330" fill="url(#fd-band)" opacity={o as number} />
            <text x={(x as number) + 14} y="22" fontSize="10" fontWeight="700" letterSpacing="1.4" fill="#6366f1" opacity="0.75">
              {t}
            </text>
          </g>
        ))}

        {/* edges */}
        <Edge d={`M98 ${Y}H152`} />
        <Edge d={`M228 ${Y}H272`} />
        <Edge d={`M348 ${Y}H392`} />
        <Edge d={`M468 ${Y}H508`} />
        <Edge d={`M580 ${Y}C620 ${Y} 620 70 662 70`} color="#e11d48" label="conflict" lx={606} ly={88} />
        <Edge d={`M580 ${Y}C620 ${Y} 620 236 662 236`} color="#059669" label="tasks" lx={606} ly={222} />
        <Edge d={`M738 70C780 70 780 ${Y} 818 ${Y}`} color="#e11d48" />
        <Edge d={`M738 236C780 236 780 ${Y} 818 ${Y}`} color="#059669" />
        <Edge d={`M894 ${Y}H942`} />
        <Edge d={`M968 112C968 72 1012 72 1012 112`} color="#7c3aed" label="self-repair" lx={990} ly={64} />
        <Edge d={`M1018 ${Y}H1072`} />
        <Edge d={`M1148 ${Y}H1212`} color="#059669" label="Approved" lx={1180} ly={Y - 10} />
        <Edge d={`M1110 214C1110 262 1160 262 1212 262`} color="#7c3aed" label="Edit" lx={1150} ly={280} />
        <Edge d={`M1288 ${Y}H1352`} color="#059669" />

        {/* nodes */}
        <Node x={60} y={Y} icon="mic" label="Speak" sub="Wispr Flow" tone="violet" />
        <Node x={190} y={Y} icon="wave" label="Transcribe" sub="Whisper · paste" />
        <Node x={310} y={Y} icon="spark" label="Understand" sub="speakers · clean" />
        <Node x={430} y={Y} icon="db" label="Memory" sub="past decisions" />
        {/* decision diamond */}
        <g className="fd-node" transform={`translate(544 ${Y})`}>
          <rect x="-27" y="-27" width="54" height="54" rx="10" fill="#fff" filter="url(#fd-shadow)" transform="rotate(45)" />
          <rect x="-9" y="-9" width="18" height="18" rx="3" fill="none" stroke="#4f46e5" strokeWidth="2" transform="rotate(45)" />
          <text y="58" textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f172a">
            Conflict?
          </text>
        </g>
        <Node x={700} y={70} icon="alert" label="Flag" sub="reversal + impact" tone="rose" />
        <Node x={700} y={236} icon="list" label="Extract" sub="owners · dates" tone="emerald" />
        <Node x={856} y={Y} icon="merge" label="Draft" sub="decisions + tasks" />
        <Node x={980} y={Y} icon="shield" label="Validate" sub="Zod schema" tone="violet" />
        <Node x={1110} y={Y} icon="user" label="You review" sub="human-in-loop" tone="amber" />
        <Node x={1250} y={Y} icon="send" label="Execute" sub="tracker · Slack" tone="emerald" />
        <Node x={1250} y={262} icon="mic" label="Fix by voice" sub="↺ re-drafts plan" tone="violet" />
        <Node x={1390} y={Y} icon="bell" label="Follow up" sub="remind · digest" tone="emerald" />
      </svg>
    </div>
  );
}
