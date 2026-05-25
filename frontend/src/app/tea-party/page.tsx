import { Alice } from "next/font/google";
import Link from "next/link";
import JournalEntry from "@/components/JournalEntry";
import JournalCard from "@/components/JournalCard";
import { HandWrittenTitle } from "@/components/ui/hand-writing-text";

const alice = Alice({
  subsets: ["latin"],
  weight: "400",
});

interface JournalEntryDoc {
  _id: string;
  content: string;
  mood: string;
  moodScore: number;
  validation: string;
  affirmation: string;
  moodRating: number | null;
  createdAt: string;
}

async function getEntries(): Promise<JournalEntryDoc[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/journal?userId=demo-user`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { entries: JournalEntryDoc[] };
    return data.entries ?? [];
  } catch {
    return [];
  }
}

// Colours cycle through 3 green shades for variety
const PAD_COLORS = ["#4cc85a", "#60d468", "#78e080", "#8ae850", "#3ec048"] as const;

const lilyPads: { x: number; y: number; r: number; rot: number; drift: string; rotAnim: string; dur: string; delay: string; fill: string }[] = [
  // Top-left corner
  { x: 80,   y: 60,  r: 36, rot: 15,  drift: "pad-drift-a", rotAnim: "",             dur: "28s", delay: "0s",   fill: PAD_COLORS[0] },
  // Top-right corner
  { x: 1340, y: 90,  r: 40, rot: -20, drift: "pad-drift-b", rotAnim: "",             dur: "32s", delay: "2s",   fill: PAD_COLORS[1] },
  // Bottom-left corner
  { x: 100,  y: 800, r: 42, rot: 10,  drift: "pad-drift-c", rotAnim: "pad-wobble-a", dur: "30s", delay: "1s",   fill: PAD_COLORS[2] },
  // Bottom-right corner
  { x: 1300, y: 780, r: 34, rot: -30, drift: "pad-drift-a", rotAnim: "",             dur: "35s", delay: "3s",   fill: PAD_COLORS[3] },
  // Left edge mid
  { x: 60,   y: 420, r: 30, rot: 25,  drift: "pad-drift-b", rotAnim: "",             dur: "26s", delay: "1.5s", fill: PAD_COLORS[4] },
  // Right edge mid
  { x: 1380, y: 450, r: 38, rot: -15, drift: "pad-drift-c", rotAnim: "",             dur: "29s", delay: "2.5s", fill: PAD_COLORS[0] },
];

const lotusOnPads = [1, 4];


function FloatingFlower({ x, y, s, drift, dur, delay }: {
  x: number; y: number; s: number; drift: string; dur: string; delay: string;
}) {
  return (
    <g className={drift} style={{ animationDuration: dur, animationDelay: delay }}>
      <g transform={`translate(${x},${y}) scale(${s})`}>
        {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((a) => (
          <ellipse key={a}
            cx="0" cy="-10"
            rx="4" ry="9"
            fill="#f8f4ee" opacity="0.93"
            transform={`rotate(${a})`} />
        ))}
        <circle cx="0" cy="0" r="5.5" fill="#f5c842" />
        <circle cx="0" cy="0" r="3" fill="#e8a820" opacity="0.9" />
      </g>
    </g>
  );
}

function LilyPad({ x, y, r, rot, drift, rotAnim, dur, delay, fill }: {
  x: number; y: number; r: number; rot: number;
  drift: string; rotAnim: string; dur: string; delay: string; fill: string;
}) {
  const a1 = -Math.PI / 2 + Math.PI / 5;
  const a2 = -Math.PI / 2 - Math.PI / 5;
  const x1 = (x + r * Math.cos(a1)).toFixed(2);
  const y1 = (y + r * Math.sin(a1)).toFixed(2);
  const x2 = (x + r * Math.cos(a2)).toFixed(2);
  const y2 = (y + r * Math.sin(a2)).toFixed(2);
  const d = `M ${x} ${y} L ${x1} ${y1} A ${r} ${r} 0 1 0 ${x2} ${y2} Z`;
  return (
    <g className={drift} style={{ animationDuration: dur, animationDelay: delay }}>
      <g transform={`rotate(${rot}, ${x}, ${y})`} className={rotAnim || undefined} style={rotAnim ? { transformOrigin: `${x}px ${y}px`, animationDuration: `${parseInt(dur) * 1.6}s`, animationDelay: delay } : undefined}>
        <path d={d} fill={fill} opacity="0.45" />
        <path d={d} fill="none" stroke="#a8d870" strokeWidth="0.8" opacity="0.15" />
      </g>
    </g>
  );
}

function Lotus({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {[0, 51.4, 102.8, 154.2, 205.7, 257.1, 308.5].map((a) => (
        <ellipse key={a}
          cx={0} cy={-(r * 1.15)}
          rx={r * 0.38} ry={r * 0.88}
          fill="#e890b0" opacity="0.82"
          transform={`rotate(${a})`} />
      ))}
      {[25.7, 77.1, 128.5, 180, 231.4, 282.8, 334.2].map((a) => (
        <ellipse key={a}
          cx={0} cy={-(r * 0.85)}
          rx={r * 0.28} ry={r * 0.65}
          fill="#f0b8cc" opacity="0.9"
          transform={`rotate(${a})`} />
      ))}
      <circle cx={0} cy={0} r={r * 0.3} fill="#f5d0e0" opacity="0.95" />
      <circle cx={0} cy={0} r={r * 0.15} fill="#f8e8f0" opacity="1" />
    </g>
  );
}

const floatingFlowers = [
  { x: 420, y: 200, s: 1.1, drift: "pad-drift-a", dur: "19s", delay: "0s" },
  { x: 720, y: 380, s: 0.85, drift: "pad-drift-c", dur: "25s", delay: "2.2s" },
  { x: 1100, y: 250, s: 1.0, drift: "pad-drift-b", dur: "22s", delay: "1.0s" },
  { x: 340, y: 450, s: 0.75, drift: "pad-drift-a", dur: "30s", delay: "3.5s" },
  { x: 1260, y: 560, s: 0.9, drift: "pad-drift-c", dur: "27s", delay: "0.5s" },
  { x: 640, y: 560, s: 0.8, drift: "pad-drift-b", dur: "34s", delay: "1.8s" },
];

// Ripple centres match lotus pad positions (lotusOnPads = [0, 3, 6])
const rippleOrigins = [
  { x: 210, y: 580, delay: "0s" },  // pad 0
  { x: 890, y: 420, delay: "1.8s" },  // pad 3
  { x: 1180, y: 300, delay: "3.2s" },  // pad 6
];
const RIPPLE_COUNT = 4;

function Koi({ color, bodyColor, scale = 1 }: {
  color: string; bodyColor: string; scale?: number;
}) {
  return (
    <g transform={`scale(${scale})`}>
      <ellipse cx="0" cy="0" rx="18" ry="7" fill={bodyColor} opacity="0.92" />
      <ellipse cx="16" cy="0" rx="6" ry="5.5" fill={color} opacity="0.95" />
      <path d="M -18 0 L -28 -8 L -22 0 L -28 8 Z" fill={color} opacity="0.85" />
      <path d="M -4 -7 Q 4 -16 10 -7" fill={color} opacity="0.6" />
      <ellipse cx="2" cy="-2" rx="7" ry="4" fill={color} opacity="0.55" />
      <circle cx="19" cy="-1.5" r="1.2" fill="#1a0a08" />
    </g>
  );
}

const koiDefs = [
  {
    id: "koi-red",
    color: "#c84830", bodyColor: "#e05a3a", scale: 1.1,
    path: "M 150 350 C 400 200, 800 450, 1100 320 C 1300 240, 1380 480, 1200 600 C 950 720, 500 580, 280 680 C 100 760, 50 500, 150 350 Z",
    dur: "16s", delay: "0s",
  },
  {
    id: "koi-gold",
    color: "#d4a025", bodyColor: "#e8c040", scale: 0.9,
    path: "M 900 200 C 1200 300, 1350 600, 1100 720 C 850 840, 550 700, 350 800 C 150 880, 80 640, 200 480 C 380 280, 700 100, 900 200 Z",
    dur: "20s", delay: "5s",
  },
  {
    id: "koi-white",
    color: "#e8e4d8", bodyColor: "#f5f0e8", scale: 0.85,
    path: "M 600 650 C 400 500, 200 300, 450 180 C 700 60, 1050 250, 1250 450 C 1400 600, 1250 780, 1000 820 C 750 860, 650 800, 600 650 Z",
    dur: "24s", delay: "10s",
  },
];

const reeds = [
  { x: 40, h: 180, lean: 8, delay: "0s" },
  { x: 70, h: 140, lean: -6, delay: "0.4s" },
  { x: 100, h: 200, lean: 4, delay: "0.9s" },
  { x: 130, h: 160, lean: -9, delay: "0.2s" },
  { x: 160, h: 190, lean: 6, delay: "1.1s" },
  { x: 1300, h: 170, lean: -7, delay: "0.6s" },
  { x: 1330, h: 210, lean: 5, delay: "0s" },
  { x: 1360, h: 145, lean: -4, delay: "0.8s" },
  { x: 1390, h: 185, lean: 8, delay: "1.4s" },
  { x: 1415, h: 155, lean: -5, delay: "0.3s" },
  { x: 380, h: 90, lean: 3, delay: "0.7s" },
  { x: 760, h: 100, lean: -4, delay: "1.0s" },
  { x: 1050, h: 85, lean: 5, delay: "0.5s" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TeaPartyPage() {
  const entries = await getEntries();

  return (
    <>
      <style>{`
        .pond-page { min-height: 100vh; background: #1a5e30; position: relative; }
        .pond-page-bg-img {
          position: fixed; inset: 0; z-index: 0;
          width: 100vw; height: 100vh;
          object-fit: cover; object-position: center;
          pointer-events: none;
          filter: brightness(0.55) saturate(0.6) contrast(0.9);
          opacity: 0.85;
        }
        .pond-bg {
          position: fixed; inset: 0; z-index: 1;
          overflow: hidden; pointer-events: none;
        }
        .pond-art { width: 100%; height: 100%; position: absolute; inset: 0; }
        .pond-content {
          position: relative; z-index: 12;
          max-width: 480px; margin: 0 auto;
          padding: 2rem 1.5rem 2rem;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        @keyframes water-shimmer {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.9; }
        }
        .water-shimmer { animation: water-shimmer 5s ease-in-out infinite; }
        @keyframes pad-drift-a {
          0%   { transform: translate(0px,  0px); }
          25%  { transform: translate(6px,  -4px); }
          50%  { transform: translate(10px,  2px); }
          75%  { transform: translate(4px,   6px); }
          100% { transform: translate(0px,  0px); }
        }
        @keyframes pad-drift-b {
          0%   { transform: translate(0px,  0px); }
          33%  { transform: translate(-8px,  5px); }
          66%  { transform: translate(4px,  -6px); }
          100% { transform: translate(0px,  0px); }
        }
        @keyframes pad-drift-c {
          0%   { transform: translate(0px,  0px); }
          20%  { transform: translate(5px,   3px); }
          60%  { transform: translate(-6px, -4px); }
          100% { transform: translate(0px,  0px); }
        }
        @keyframes pad-wobble-a {
          0%   { transform: rotate(0deg);   }
          20%  { transform: rotate(8deg);   }
          50%  { transform: rotate(-5deg);  }
          80%  { transform: rotate(10deg);  }
          100% { transform: rotate(0deg);   }
        }
        @keyframes pad-wobble-b {
          0%   { transform: rotate(0deg);   }
          30%  { transform: rotate(-10deg); }
          60%  { transform: rotate(6deg);   }
          85%  { transform: rotate(-4deg);  }
          100% { transform: rotate(0deg);   }
        }
        .pad-drift-a  { animation: pad-drift-a  ease-in-out infinite; }
        .pad-drift-b  { animation: pad-drift-b  ease-in-out infinite; }
        .pad-drift-c  { animation: pad-drift-c  ease-in-out infinite; }
        .pad-wobble-a { animation: pad-wobble-a ease-in-out infinite; }
        .pad-wobble-b { animation: pad-wobble-b ease-in-out infinite; }
        @keyframes ripple-expand {
          0%   { r: 4;  opacity: 0.55; }
          100% { r: 80; opacity: 0;    }
        }
        .ripple-ring { animation: ripple-expand 4s ease-out infinite; }
        @keyframes reed-sway {
          0%, 100% { transform: rotate(0deg); }
          50%       { transform: rotate(2.5deg); }
        }
        .reed { animation: reed-sway 3.5s ease-in-out infinite; transform-origin: bottom center; }
      `}</style>

      <div className={`${alice.className} pond-page`}>

        {/* Background image */}
        <img src="/journalbg.jpg" alt="" aria-hidden className="pond-page-bg-img" />

        {/* Animated SVG overlay (fish, lily pads, etc.) */}
        <div className="pond-bg" aria-hidden>
          <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="pond-art">
            <defs>
              {/* Water depth — vivid green */}
              <radialGradient id="wDeep" cx="50%" cy="48%" r="55%">
                <stop offset="0%" stopColor="#2a9045" />
                <stop offset="45%" stopColor="#1d7035" />
                <stop offset="100%" stopColor="#0f4820" />
              </radialGradient>
              {/* Edge darkening */}
              <radialGradient id="wEdge" cx="50%" cy="50%" r="50%">
                <stop offset="60%" stopColor="#000000" stopOpacity="0" />
                <stop offset="100%" stopColor="#0a3018" stopOpacity="0.55" />
              </radialGradient>
              {/* Shimmer streak — yellow-green */}
              <linearGradient id="wShimmer" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a8e860" stopOpacity="0" />
                <stop offset="50%" stopColor="#a8e860" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#a8e860" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Base water removed — journalbg.jpg shows through */}

            {/* Shimmer streaks */}
            {[
              { x: 180, y: 120, w: 420, h: 180, rot: -18, delay: "0s" },
              { x: 680, y: 280, w: 380, h: 140, rot: 12, delay: "2.1s" },
              { x: 980, y: 160, w: 320, h: 160, rot: -8, delay: "1.3s" },
              { x: 320, y: 520, w: 440, h: 120, rot: 20, delay: "3.4s" },
              { x: 800, y: 580, w: 360, h: 100, rot: -14, delay: "0.7s" },
            ].map((s, i) => (
              <ellipse key={i}
                cx={s.x + s.w / 2} cy={s.y + s.h / 2}
                rx={s.w / 2} ry={s.h / 2}
                fill="url(#wShimmer)"
                transform={`rotate(${s.rot}, ${s.x + s.w / 2}, ${s.y + s.h / 2})`}
                className="water-shimmer"
                style={{ animationDelay: s.delay }} />
            ))}

            {rippleOrigins.map((origin, oi) =>
              Array.from({ length: RIPPLE_COUNT }, (_, ri) => (
                <circle key={`${oi}-${ri}`}
                  cx={origin.x} cy={origin.y}
                  r={4}
                  fill="none"
                  stroke="#6abf50"
                  strokeWidth="0.9"
                  opacity="0.55"
                  className="ripple-ring"
                  style={{
                    animationDelay: `calc(${origin.delay} + ${ri * 1.0}s)`,
                  }} />
              ))
            )}
            {lilyPads.map((lp, i) => <LilyPad key={i} {...lp} />)}
            {lotusOnPads.map((i) => (
              <Lotus key={i} x={lilyPads[i].x} y={lilyPads[i].y} r={lilyPads[i].r * 0.35} />
            ))}
            {floatingFlowers.map((f, i) => <FloatingFlower key={i} {...f} />)}

            {/* Koi motion paths (hidden) */}
            <defs>
              {koiDefs.map((koi) => (
                <path key={koi.id} id={`${koi.id}-path`} d={koi.path} />
              ))}
            </defs>

            {/* Koi fish */}
            {koiDefs.map((koi) => (
              <g key={koi.id} opacity="0.88">
                <Koi color={koi.color} bodyColor={koi.bodyColor} scale={koi.scale} />
                <animateMotion dur={koi.dur} repeatCount="indefinite" begin={koi.delay} rotate="auto">
                  <mpath href={`#${koi.id}-path`} />
                </animateMotion>
              </g>
            ))}

            {/* Reeds */}
            {reeds.map((rd, i) => (
              <g key={i} className="reed" style={{ animationDelay: rd.delay }}>
                <line
                  x1={rd.x} y1={900}
                  x2={rd.x + rd.lean} y2={900 - rd.h}
                  stroke="#1a3a20" strokeWidth="2.2" opacity="0.72" />
                <ellipse
                  cx={rd.x + rd.lean} cy={900 - rd.h - 10}
                  rx="3" ry="9"
                  fill="#1a3a20" opacity="0.65" />
              </g>
            ))}

            {/* Top veil removed — using journalbg.jpg */}
          </svg>
        </div>

        {/* Scrollable content */}
        <div className="pond-content">

          {/* Title */}
          <div className="[&_*]:!text-[#f0f5ec] drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
            <HandWrittenTitle title="Down the Rabbit Hole" subtitle="Write what Wonderland whispers" />
          </div>

          {/* Journal form card */}
          <div className="w-full rounded-2xl border border-[rgba(80,180,80,0.25)] p-4 md:p-6 bg-[rgba(6,28,12,0.62)] backdrop-blur-2xl">
            <JournalEntry userId="demo-user" />
          </div>

          {/* Past entries */}
          {entries.length > 0 && (
            <section className="mt-12">
              <div className="space-y-4">
                {entries.map((entry) => (
                  <JournalCard key={entry._id} entry={entry} />
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </>
  );
}
