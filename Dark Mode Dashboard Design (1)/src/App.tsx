import { useState, useEffect, useRef, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type NavTab = "Command Overview" | "3D Hologram Twin" | "AI & SHAP Analytics" | "Mission Replay";
type FaultOption = "None" | "Cylinder Misfire" | "Oil Pressure Drop" | "CHT Overheat" | "Fuel Injector Fail";

// ── Telemetry simulation ───────────────────────────────────────────────────────
function useTelemetry(fault: FaultOption, running: boolean) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick(t => t + 1), 800);
    return () => clearInterval(id);
  }, [running]);

  // Memoize on tick so values are stable between renders
  const values = useMemo(() => {
    const noise = (base: number, range: number) => base + (Math.random() - 0.5) * range;
    const isFault = fault !== "None";
    return {
      rpm:      running ? noise(isFault && fault === "Cylinder Misfire" ? 2400 : 3000, isFault ? 220 : 60) : 3000,
      cht:      running ? noise(isFault && fault === "CHT Overheat" ? 248 : 172, isFault ? 30 : 8) : 172,
      egt:      running ? noise(isFault ? 780 : 640, isFault ? 60 : 20) : 640,
      oilP:     running ? noise(isFault && fault === "Oil Pressure Drop" ? 2.8 : 5.2, isFault ? 0.6 : 0.2) : 5.2,
      oilT:     running ? noise(isFault ? 108 : 78, isFault ? 12 : 4) : 78,
      vibRms:   running ? noise(isFault ? 0.95 : 0.32, isFault ? 0.2 : 0.05) : 0.32,
      health:   isFault ? (fault === "Oil Pressure Drop" ? 58 : 71) : 95,
      rul:      isFault ? 410 : 1150,
      fidelity: running ? noise(98.6, 0.3) : 98.6,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, fault, running]);

  return { ...values, tick };
}

// ── Chart history ──────────────────────────────────────────────────────────────
type HistPoint = { t: number; real: number; twin: number; delta: number };

function useHistory(cht: number, tick: number, len = 28): HistPoint[] {
  const buf = useRef<HistPoint[]>(
    Array.from({ length: len }, (_, i) => ({ t: i, real: cht, twin: cht, delta: 0 }))
  );
  const prevTick = useRef(-1);

  if (tick !== prevTick.current) {
    prevTick.current = tick;
    const twin = cht + (Math.random() - 0.5) * 6;
    const point: HistPoint = {
      t: tick,
      real: Math.round(cht * 10) / 10,
      twin: Math.round(twin * 10) / 10,
      delta: Math.round((cht - twin) * 10) / 10,
    };
    buf.current = [...buf.current.slice(-(len - 1)), point];
  }

  return buf.current;
}

// ── Radial gauge ───────────────────────────────────────────────────────────────
function RadialGauge({ label, value, min, max, unit, color, warn, crit }: {
  label: string; value: number; min: number; max: number; unit: string; color: string; warn?: number; crit?: number;
}) {
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const r = 28;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const offset = arc - arc * pct;
  const isWarn = warn !== undefined && value >= warn;
  const isCrit = crit !== undefined && value >= crit;
  const strokeColor = isCrit ? "#EF4444" : isWarn ? "#F59E0B" : color;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-[76px] h-[76px]">
        <svg width="76" height="76" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"
            strokeDasharray={`${arc} ${circ - arc}`} strokeDashoffset={-circ * 0.125}
            strokeLinecap="round" transform="rotate(135 38 38)" />
          <circle cx="38" cy="38" r={r} fill="none" stroke={strokeColor} strokeWidth="6"
            strokeDasharray={`${arc} ${circ - arc}`} strokeDashoffset={-circ * 0.125 + offset}
            strokeLinecap="round" transform="rotate(135 38 38)"
            style={{ filter: `drop-shadow(0 0 4px ${strokeColor})`, transition: "stroke-dashoffset 0.5s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[11px] font-bold" style={{ color: strokeColor }}>
            {typeof value === "number" ? value.toFixed(value > 100 ? 0 : 1) : value}
          </span>
          <span className="text-[8px] text-slate-500 leading-none">{unit}</span>
        </div>
      </div>
      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider text-center leading-tight">{label}</span>
    </div>
  );
}

// ── Circular health ring ───────────────────────────────────────────────────────
function HealthRing({ pct, fault }: { pct: number; fault: boolean }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct / 100;
  const color = pct >= 85 ? "#10B981" : pct >= 65 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative w-[100px] h-[100px]">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 1s ease" }} />
        {fault && (
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(239,68,68,0.15)" strokeWidth="8"
            className="animate-pulse-red" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl font-bold" style={{ color }}>{pct}%</span>
        <span className="text-[9px] text-slate-400">HEALTH</span>
      </div>
    </div>
  );
}

// ── 3D Engine viewport (CSS/SVG) ───────────────────────────────────────────────
function EngineViewport({ fault, explosionPct, layer }: { fault: boolean; explosionPct: number; layer: string }) {
  const cylColors = ["#00F0FF", "#00F0FF", fault ? "#EF4444" : "#00F0FF", "#00F0FF"];
  const spread = explosionPct / 100;

  return (
    <div className="relative w-full h-full bg-[#050810] rounded overflow-hidden flex items-center justify-center"
      style={{ perspective: "600px" }}>
      {/* Grid floor */}
      <div className="absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(0,240,255,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(0,240,255,0.08) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
          transform: "rotateX(55deg) translateY(40%) scale(2)",
          transformOrigin: "center center",
          opacity: 0.6,
        }} />

      {/* Engine body */}
      <div className="relative flex flex-col items-center" style={{ transform: "perspective(400px) rotateX(5deg) rotateY(-8deg)" }}>
        {/* Engine block */}
        <div className="relative flex gap-2 items-end mb-1">
          {[0,1,2,3].map(i => (
            <div key={i} className="flex flex-col items-center gap-0.5"
              style={{ transform: `translateY(${-i * spread * 6}px) translateX(${i * spread * 4}px)` }}>
              {/* Cylinder head */}
              <div className="w-10 h-5 rounded-t"
                style={{
                  background: `linear-gradient(135deg, ${cylColors[i]}22, ${cylColors[i]}44)`,
                  border: `1px solid ${cylColors[i]}`,
                  boxShadow: `0 0 ${fault && i === 2 ? 16 : 6}px ${cylColors[i]}${fault && i === 2 ? "99" : "44"}`,
                  transition: "all 0.5s",
                }} />
              {/* Cylinder */}
              <div className="w-10 h-14"
                style={{
                  background: "linear-gradient(180deg, #1a2a4a 0%, #0d1824 100%)",
                  border: "1px solid rgba(0,240,255,0.2)",
                  position: "relative",
                }}>
                {/* Piston animation */}
                <div className="absolute inset-x-1 h-3 rounded"
                  style={{
                    background: "rgba(0,240,255,0.15)",
                    top: fault && i === 2 ? "30%" : `${20 + Math.sin(Date.now() / 300 + i * 1.5) * 15}%`,
                    transition: "top 0.1s",
                    border: "1px solid rgba(0,240,255,0.3)",
                  }} />
              </div>
              {/* HUD tag */}
              <div className="text-[7px] font-mono px-1 py-0.5 rounded"
                style={{ background: `${cylColors[i]}22`, color: cylColors[i], border: `1px solid ${cylColors[i]}44` }}>
                CYL-{i+1}
              </div>
            </div>
          ))}
        </div>

        {/* Engine base / oil sump */}
        {(layer === "All" || layer === "Oil Sump") && (
          <div className="w-48 h-6 rounded"
            style={{
              background: "linear-gradient(135deg, #0d2a1a 0%, #0a1a30 100%)",
              border: "1px solid rgba(16,185,129,0.3)",
              boxShadow: "0 0 8px rgba(16,185,129,0.15)",
              marginTop: `${spread * 8}px`,
            }}>
            <div className="flex items-center justify-center h-full">
              <span className="text-[8px] font-mono text-emerald-400">OIL SUMP ▪ 5.2L</span>
            </div>
          </div>
        )}

        {/* Exhaust headers */}
        {(layer === "All" || layer === "Exhaust") && (
          <div className="absolute -right-12 top-0 flex flex-col gap-1">
            {[0,1,2,3].map(i => (
              <div key={i} className="flex items-center gap-0.5"
                style={{ transform: `translateY(${i * 4}px) translateX(${i * spread * 3}px)` }}>
                <div className="w-8 h-1.5 rounded"
                  style={{ background: "linear-gradient(90deg, #F59E0B44, #EF444444)", border: "1px solid #F59E0B44" }} />
                <div className="w-4 h-1 rounded-r" style={{ background: "#EF444433" }} />
              </div>
            ))}
          </div>
        )}

        {/* Injectors */}
        {(layer === "All" || layer === "Injectors") && (
          <div className="absolute -left-10 top-0 flex flex-col gap-2">
            {[0,1,2,3].map(i => (
              <div key={i} className="w-3 h-2 rounded"
                style={{ background: "#A855F744", border: "1px solid #A855F766",
                  boxShadow: "0 0 4px #A855F744",
                  transform: `translateY(${i * spread * 4}px)` }} />
            ))}
          </div>
        )}
      </div>

      {/* Floating HUD tags */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 z-20">
        {[
          { label: "CHT", val: fault ? "248°C" : "172°C", color: fault ? "#EF4444" : "#00F0FF" },
          { label: "EGT", val: fault ? "782°C" : "641°C", color: fault ? "#F59E0B" : "#00F0FF" },
          { label: "Oil P", val: fault ? "2.8 bar" : "5.2 bar", color: fault ? "#EF4444" : "#10B981" },
        ].map(tag => (
          <div key={tag.label} className="flex items-center gap-1.5 px-2 py-1 rounded"
            style={{ background: "rgba(7,11,20,0.85)", border: `1px solid ${tag.color}44`, backdropFilter: "blur(8px)" }}>
            <div className="w-1 h-4 rounded-full" style={{ background: tag.color, boxShadow: `0 0 6px ${tag.color}` }} />
            <span className="text-[9px] font-mono text-slate-400">{tag.label}</span>
            <span className="text-[10px] font-mono font-bold" style={{ color: tag.color }}>{tag.val}</span>
          </div>
        ))}
      </div>

      {/* Alert pulse on fault */}
      {fault && (
        <div className="absolute top-1/3 left-1/3 w-4 h-4 rounded-full animate-pulse-red z-20"
          style={{ background: "rgba(239,68,68,0.5)", border: "2px solid #EF4444" }}>
          <div className="absolute -inset-2 rounded-full border border-red-500 opacity-50 animate-ping" />
        </div>
      )}

      {/* Corner brackets */}
      <div className="absolute top-2 left-2 w-6 h-6 border-t border-l border-cyan-400/50" />
      <div className="absolute top-2 right-2 w-6 h-6 border-t border-r border-cyan-400/50" />
      <div className="absolute bottom-2 left-2 w-6 h-6 border-b border-l border-cyan-400/50" />
      <div className="absolute bottom-2 right-2 w-6 h-6 border-b border-r border-cyan-400/50" />

      {/* Label */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded text-[9px] font-mono text-cyan-400/70"
        style={{ background: "rgba(0,240,255,0.06)", border: "1px solid rgba(0,240,255,0.1)" }}>
        ENG_001 ▸ 4-CYL PISTON ▸ LIVE RENDER
      </div>
    </div>
  );
}

// ── SHAP bar ───────────────────────────────────────────────────────────────────
function ShapBar({ label, value, max, positive }: { label: string; value: string; max: number; positive: boolean }) {
  const pct = Math.abs(parseFloat(value)) / max * 100;
  const color = positive ? "#EF4444" : "#0070F3";
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] text-slate-400 w-32 shrink-0 text-right truncate">{label}</span>
      <div className="flex-1 flex items-center gap-1">
        {!positive && <div className="h-3 rounded" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }} />}
        <div className="w-px h-4 bg-slate-600" />
        {positive && <div className="h-3 rounded" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }} />}
      </div>
      <span className="font-mono text-[10px] font-bold shrink-0" style={{ color }}>{positive ? "+" : ""}{value}</span>
    </div>
  );
}

// ── Progress health bar ────────────────────────────────────────────────────────
function SubsystemCard({ name, health, rul, icon }: { name: string; health: number; rul: number; icon: string }) {
  const color = health >= 80 ? "#10B981" : health >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <div className="glass rounded p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>
          <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wide">{name}</span>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color, background: `${color}15`, border: `1px solid ${color}33` }}>
          {health}%
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-slate-800">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${health}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 6px ${color}66` }} />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[8px] text-slate-500 uppercase tracking-wider">Remaining Life</span>
        <span className="font-mono text-[10px] font-bold text-cyan-400">{rul}h</span>
      </div>
    </div>
  );
}

// ── SVG Sync Chart ────────────────────────────────────────────────────────────
function SvgSyncChart({ data }: { data: { t: number; real: number; twin: number; delta: number }[] }) {
  const W = 380, H = 110;
  const pad = { t: 8, r: 8, b: 16, l: 28 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;

  if (data.length < 2) return null;
  const vals = data.flatMap(d => [d.real, d.twin]);
  const minV = Math.min(...vals) - 5;
  const maxV = Math.max(...vals) + 5;
  const range = maxV - minV || 1;

  const x = (i: number) => pad.l + (i / (data.length - 1)) * cw;
  const y = (v: number) => pad.t + (1 - (v - minV) / range) * ch;

  const pathFor = (key: "real" | "twin") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");

  // residual fill polygon
  const topPts = data.map((d, i) => `${x(i).toFixed(1)},${y(Math.max(d.real, d.twin)).toFixed(1)}`);
  const botPts = data.map((d, i) => `${x(i).toFixed(1)},${y(Math.min(d.real, d.twin)).toFixed(1)}`).reverse();
  const residualPoly = [...topPts, ...botPts].join(" ");

  // y-axis ticks
  const ticks = [minV + range * 0.25, minV + range * 0.5, minV + range * 0.75].map(v => Math.round(v));

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="residualG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A855F7" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {ticks.map(v => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <text x={pad.l - 3} y={y(v) + 3} textAnchor="end" fontSize="7" fontFamily="JetBrains Mono" fill="#475569">{v}</text>
        </g>
      ))}
      {/* Residual band */}
      <polygon points={residualPoly} fill="url(#residualG)" />
      {/* Real sensor line */}
      <path d={pathFor("real")} stroke="#F97316" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* DT Kalman dashed line */}
      <path d={pathFor("twin")} stroke="#00F0FF" strokeWidth="1.5" fill="none" strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Axes */}
      <line x1={pad.l} x2={pad.l} y1={pad.t} y2={H - pad.b} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      {/* X labels */}
      <text x={pad.l} y={H - 2} fontSize="7" fontFamily="JetBrains Mono" fill="#334155">T-{data.length}</text>
      <text x={W - pad.r} y={H - 2} textAnchor="end" fontSize="7" fontFamily="JetBrains Mono" fill="#334155">NOW</text>
    </svg>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("Command Overview");
  const [fault, setFault] = useState<FaultOption>("None");
  const [running, setRunning] = useState(true);
  const [explosionPct, setExplosionPct] = useState(0);
  const [layer, setLayer] = useState("All");
  const [replayPos, setReplayPos] = useState(35);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState("1x");
  const [faultOpen, setFaultOpen] = useState(false);

  const tele = useTelemetry(fault, running);
  const chartHistory = useHistory(tele.cht, tele.tick, 28);
  const isFault = fault !== "None";

  // Replay scrubber
  useEffect(() => {
    if (!replayPlaying) return;
    const speed = parseInt(replaySpeed);
    const id = setInterval(() => setReplayPos(p => p >= 100 ? 0 : p + speed * 0.5), 100);
    return () => clearInterval(id);
  }, [replayPlaying, replaySpeed]);

  const tabs: NavTab[] = ["Command Overview", "3D Hologram Twin", "AI & SHAP Analytics", "Mission Replay"];
  const layers = ["All", "Cylinders", "Exhaust", "Oil Sump", "Injectors", "Core"];

  const subsystems = [
    { name: "Cylinder Heads", health: isFault && fault === "CHT Overheat" ? 62 : 91, rul: isFault ? 680 : 1340, icon: "🔩" },
    { name: "Exhaust & Turbo", health: isFault ? 74 : 88, rul: isFault ? 520 : 1100, icon: "💨" },
    { name: "Lubrication Sump", health: isFault && fault === "Oil Pressure Drop" ? 58 : 93, rul: isFault ? 410 : 1450, icon: "🛢️" },
    { name: "Fuel Injector Rail", health: isFault && fault === "Fuel Injector Fail" ? 48 : 85, rul: isFault ? 290 : 980, icon: "⚡" },
    { name: "Engine Block", health: isFault ? 79 : 96, rul: isFault ? 860 : 1620, icon: "🔧" },
  ];

  const shapItems = isFault ? [
    { label: "CHT Rise", value: "+38.5°C", max: 50, positive: true },
    { label: "Oil Pressure Drop", value: "-1.8 bar", max: 3, positive: false },
    { label: "EGT Spike", value: "+142°C", max: 200, positive: true },
    { label: "Vibration RMS", value: "+0.63g", max: 1, positive: true },
    { label: "RPM Instability", value: "-620 rpm", max: 800, positive: false },
    { label: "Fuel Flow Deviation", value: "+8.4%", max: 15, positive: true },
    { label: "Coolant Delta-T", value: "+22°C", max: 30, positive: true },
    { label: "Crank Phase Shift", value: "-2.3°", max: 5, positive: false },
  ] : [
    { label: "CHT", value: "+2.1°C", max: 50, positive: true },
    { label: "Oil Pressure", value: "+0.1 bar", max: 3, positive: true },
    { label: "EGT", value: "-3.2°C", max: 200, positive: false },
    { label: "Vibration RMS", value: "+0.02g", max: 1, positive: true },
    { label: "RPM", value: "+18 rpm", max: 800, positive: true },
    { label: "Fuel Flow", value: "+0.3%", max: 15, positive: true },
    { label: "Coolant Delta-T", value: "-0.8°C", max: 30, positive: false },
    { label: "Crank Phase", value: "+0.1°", max: 5, positive: true },
  ];

  return (
    <div className="scanlines relative w-full h-full flex flex-col overflow-hidden" style={{ background: "#070B14", fontFamily: "Inter, sans-serif" }}>

      {/* ── NAV HEADER ──────────────────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-4 h-12 shrink-0"
        style={{ background: "rgba(7,11,20,0.95)", borderBottom: "1px solid rgba(0,240,255,0.12)" }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded border border-cyan-400/30 animate-spin-slow"
              style={{ background: "rgba(0,240,255,0.04)" }} />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00F0FF" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[11px] font-bold tracking-[0.2em] text-cyan-400">AERO TWIN</span>
            <span className="text-[8px] text-slate-500 tracking-[0.1em] uppercase">MALE UAV Engine Digital Twin</span>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="flex items-center gap-1 p-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,240,255,0.1)" }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-3 py-1 rounded-full text-[10px] font-medium transition-all duration-200"
              style={{
                background: activeTab === tab ? "rgba(0,240,255,0.12)" : "transparent",
                color: activeTab === tab ? "#00F0FF" : "rgba(148,163,184,0.8)",
                border: activeTab === tab ? "1px solid rgba(0,240,255,0.3)" : "1px solid transparent",
                boxShadow: activeTab === tab ? "0 0 12px rgba(0,240,255,0.15)" : "none",
              }}>
              {tab}
            </button>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Live badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
            <span className="text-[9px] font-mono font-bold text-emerald-400 tracking-wider">LIVE LINK</span>
          </div>

          {/* Engine selector */}
          <div className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono"
            style={{ background: "rgba(0,112,243,0.1)", border: "1px solid rgba(0,112,243,0.25)", color: "#60A5FA" }}>
            <span>ENG_001</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 4 3-4" /></svg>
          </div>

          {/* Fault injector */}
          <div className="relative">
            <button onClick={() => setFaultOpen(!faultOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono transition-all"
              style={{
                background: isFault ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                border: isFault ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.1)",
                color: isFault ? "#EF4444" : "#94A3B8",
              }}>
              <span>⚠</span>
              <span>Fault Injector</span>
              {isFault && <span className="text-[8px] px-1 rounded bg-red-500/20 text-red-400">{fault}</span>}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 4 3-4" /></svg>
            </button>
            {faultOpen && (
              <div className="absolute top-full right-0 mt-1 rounded z-50 overflow-hidden"
                style={{ background: "rgba(13,22,42,0.98)", border: "1px solid rgba(0,240,255,0.15)", backdropFilter: "blur(12px)", minWidth: "180px" }}>
                {(["None", "Cylinder Misfire", "Oil Pressure Drop", "CHT Overheat", "Fuel Injector Fail"] as FaultOption[]).map(f => (
                  <button key={f} onClick={() => { setFault(f); setFaultOpen(false); }}
                    className="w-full text-left px-3 py-2 text-[10px] font-mono transition-colors hover:bg-white/5"
                    style={{ color: f === "None" ? "#10B981" : f === fault ? "#EF4444" : "#94A3B8" }}>
                    {f === "None" ? "✓ No Fault" : `⚡ ${f}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Start/Halt */}
          <button onClick={() => setRunning(!running)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-wider transition-all duration-200"
            style={{
              background: running ? "rgba(239,68,68,0.15)" : "rgba(0,240,255,0.12)",
              border: running ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(0,240,255,0.4)",
              color: running ? "#EF4444" : "#00F0FF",
              boxShadow: running ? "0 0 12px rgba(239,68,68,0.2)" : "0 0 12px rgba(0,240,255,0.2)",
            }}>
            {running ? "⏹ HALT SIM" : "▶ START SIM"}
          </button>
        </div>
      </header>

      {/* ── BODY ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden p-2 gap-2">

        {/* ── TOP METRICS ROW ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-2 shrink-0">

          {/* Card 1: Health Index */}
          <div className="glass rounded p-3 flex items-center gap-3" style={{ borderColor: isFault ? "rgba(239,68,68,0.3)" : "rgba(0,240,255,0.15)" }}>
            <HealthRing pct={tele.health} fault={isFault} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Health Index</span>
              <span className="text-[13px] font-bold" style={{ color: tele.health >= 85 ? "#10B981" : tele.health >= 65 ? "#F59E0B" : "#EF4444" }}>
                {tele.health >= 85 ? "OPTIMAL" : tele.health >= 65 ? "DEGRADED" : "CRITICAL"}
              </span>
              <span className="text-[8px] text-slate-500">Score: {tele.health}/100</span>
            </div>
          </div>

          {/* Card 2: RUL */}
          <div className="glass rounded p-3 flex flex-col justify-between">
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Remaining Useful Life</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-xl font-bold text-cyan-400">{tele.rul.toFixed(1)}</span>
              <span className="text-[10px] text-slate-400">Flight Hours</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", color: "#A855F7" }}>
                ±{isFault ? 47 : 23}h confidence
              </span>
            </div>
          </div>

          {/* Card 3: AI Diagnostics */}
          <div className="glass rounded p-3 flex flex-col justify-between"
            style={{ borderColor: isFault ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.2)" }}>
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">AI Diagnostics</span>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isFault ? "animate-pulse-red" : "animate-pulse-glow"}`}
                  style={{ background: isFault ? "#EF4444" : "#10B981" }} />
                <span className="font-mono text-[11px] font-bold" style={{ color: isFault ? "#EF4444" : "#10B981" }}>
                  {isFault ? "FAULT DETECTED" : "ALL SYSTEMS NOMINAL"}
                </span>
              </div>
              {isFault && (
                <span className="text-[9px] font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                  🚨 {fault.toUpperCase()}
                </span>
              )}
              {!isFault && (
                <span className="text-[9px] font-mono text-emerald-400/70">🟢 Confidence: 97.4%</span>
              )}
            </div>
            <span className="text-[8px] text-slate-600 font-mono">CNN-LSTM • XGBoost Ensemble</span>
          </div>

          {/* Card 4: Twin Fidelity */}
          <div className="glass rounded p-3 flex flex-col justify-between">
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Twin Fidelity Score</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-xl font-bold text-blue-400">{tele.fidelity.toFixed(1)}%</span>
              <span className="text-[9px] font-mono text-slate-500">Kalman Sync</span>
            </div>
            <div className="w-full h-1 rounded-full bg-slate-800">
              <div className="h-full rounded-full" style={{ width: `${tele.fidelity}%`, background: "linear-gradient(90deg, #0070F388, #0070F3)", transition: "width 1s" }} />
            </div>
            <span className="text-[8px] text-slate-600 font-mono">ODE-RK4 ▸ EKF ▸ 50Hz sync</span>
          </div>

          {/* Card 5: Flight Profile */}
          <div className="glass rounded p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Flight Profile</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: "rgba(0,112,243,0.15)", border: "1px solid rgba(0,112,243,0.3)", color: "#60A5FA" }}>
                CRUISE
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {[
                { l: "Altitude", v: "5,200 m" },
                { l: "Speed", v: "140 km/h" },
                { l: "RPM", v: `${Math.round(tele.rpm)}` },
                { l: "Throttle", v: "72%" },
              ].map(({ l, v }) => (
                <div key={l} className="flex flex-col">
                  <span className="text-[7px] text-slate-600 uppercase tracking-wider">{l}</span>
                  <span className="font-mono text-[10px] font-bold text-slate-200">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MAIN CENTER ───────────────────────────────────────────────────── */}
        <div className="flex-1 grid grid-cols-[1fr_420px] gap-2 min-h-0">

          {/* Left: 3D Engine Viewport */}
          <div className="glass rounded flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 shrink-0"
              style={{ borderBottom: "1px solid rgba(0,240,255,0.1)" }}>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">◈ 3D Holographic Engine Twin</span>
              <div className="flex items-center gap-1">
                {layers.map(l => (
                  <button key={l} onClick={() => setLayer(l)}
                    className="px-2 py-0.5 rounded text-[8px] font-mono transition-all"
                    style={{
                      background: layer === l ? "rgba(0,240,255,0.12)" : "transparent",
                      color: layer === l ? "#00F0FF" : "#475569",
                      border: layer === l ? "1px solid rgba(0,240,255,0.3)" : "1px solid rgba(255,255,255,0.05)",
                    }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 relative min-h-0">
              <EngineViewport fault={isFault} explosionPct={explosionPct} layer={layer} />
            </div>

            {/* Explosion slider */}
            <div className="flex items-center gap-3 px-4 py-2 shrink-0"
              style={{ borderTop: "1px solid rgba(0,240,255,0.08)" }}>
              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider whitespace-nowrap">3D Explode</span>
              <input type="range" min={0} max={100} value={explosionPct}
                onChange={e => setExplosionPct(+e.target.value)} className="flex-1" />
              <span className="font-mono text-[10px] text-cyan-400 w-8 text-right">{explosionPct}%</span>
            </div>
          </div>

          {/* Right: Chart + Gauges */}
          <div className="flex flex-col gap-2">

            {/* Physics sync chart */}
            <div className="glass rounded flex flex-col overflow-hidden" style={{ height: "55%" }}>
              <div className="flex items-center justify-between px-3 py-2 shrink-0"
                style={{ borderBottom: "1px solid rgba(0,240,255,0.1)" }}>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">◈ Physics DT Sync — CHT °C</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-orange-400 rounded" /><span className="text-[8px] font-mono text-slate-500">Real Sensor</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-0.5 border-t border-dashed border-cyan-400" /><span className="text-[8px] font-mono text-slate-500">DT Kalman</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-2 rounded" style={{ background: "rgba(168,85,247,0.2)" }} /><span className="text-[8px] font-mono text-slate-500">Residual</span></div>
                </div>
              </div>
              <div className="flex-1 min-h-0 p-2">
                <SvgSyncChart data={chartHistory} />
              </div>
            </div>

            {/* Gauges */}
            <div className="glass rounded flex-1 flex flex-col overflow-hidden">
              <div className="px-3 py-2 shrink-0" style={{ borderBottom: "1px solid rgba(0,240,255,0.1)" }}>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">◈ Live Sensor Gauges</span>
              </div>
              <div className="flex-1 flex items-center justify-around px-3 py-2">
                <RadialGauge label="RPM" value={tele.rpm} min={0} max={4000} unit="rpm" color="#0070F3" warn={3600} crit={3900} />
                <RadialGauge label="CHT" value={tele.cht} min={0} max={300} unit="°C" color="#00F0FF" warn={200} crit={240} />
                <RadialGauge label="EGT" value={tele.egt} min={0} max={900} unit="°C" color="#F59E0B" warn={700} crit={820} />
                <RadialGauge label="Oil Pres." value={tele.oilP} min={0} max={8} unit="bar" color="#10B981" />
                <RadialGauge label="Oil Temp" value={tele.oilT} min={0} max={150} unit="°C" color="#A855F7" warn={110} crit={135} />
                <RadialGauge label="Vib. RMS" value={tele.vibRms} min={0} max={1.5} unit="g" color="#00F0FF" warn={0.7} crit={1.1} />
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM SECTION ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 shrink-0" style={{ height: "26%" }}>

          {/* Subsystem RUL Matrix */}
          <div className="glass rounded flex flex-col overflow-hidden">
            <div className="px-3 py-2 shrink-0" style={{ borderBottom: "1px solid rgba(0,240,255,0.1)" }}>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">◈ Subsystem RUL Matrix</span>
            </div>
            <div className="flex-1 grid grid-cols-5 gap-2 p-2 overflow-hidden">
              {subsystems.map(s => <SubsystemCard key={s.name} {...s} />)}
            </div>
          </div>

          {/* SHAP explainability */}
          <div className="glass rounded flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 shrink-0"
              style={{ borderBottom: "1px solid rgba(0,240,255,0.1)" }}>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">◈ SHAP AI Root Cause Analysis</span>
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: isFault ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", color: isFault ? "#EF4444" : "#10B981", border: isFault ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(16,185,129,0.3)" }}>
                {isFault ? "ANOMALY MODE" : "BASELINE NOMINAL"}
              </span>
            </div>
            <div className="flex-1 flex flex-col justify-around px-3 py-2 gap-0.5 overflow-hidden">
              {shapItems.slice(0, 6).map(item => (
                <ShapBar key={item.label} {...item} />
              ))}
            </div>
          </div>

          {/* Mission Replay */}
          <div className="glass rounded flex flex-col overflow-hidden" style={{ minWidth: "280px" }}>
            <div className="px-3 py-2 shrink-0" style={{ borderBottom: "1px solid rgba(0,240,255,0.1)" }}>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">◈ Mission Replay</span>
            </div>
            <div className="flex-1 flex flex-col justify-between p-3">
              {/* Timeline labels */}
              <div className="flex justify-between text-[8px] font-mono text-slate-600">
                <span>TAKEOFF</span><span>CLIMB</span><span>CRUISE</span><span>DESCENT</span><span>LAND</span>
              </div>

              {/* Scrubber */}
              <div className="flex flex-col gap-1">
                <input type="range" min={0} max={100} value={replayPos}
                  onChange={e => setReplayPos(+e.target.value)} className="w-full" />
                <div className="flex justify-between text-[8px] font-mono text-slate-600">
                  <span>00:00</span><span className="text-cyan-400">{Math.floor(replayPos * 1.2).toString().padStart(2,"0")}:{((replayPos * 72) % 60).toFixed(0).padStart(2,"0")}</span><span>02:00h</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button onClick={() => setReplayPos(0)}
                    className="w-7 h-7 rounded flex items-center justify-center text-[10px] transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748B" }}>
                    ⏮
                  </button>
                  <button onClick={() => setReplayPlaying(!replayPlaying)}
                    className="w-8 h-8 rounded flex items-center justify-center text-[12px] font-bold transition-all"
                    style={{
                      background: replayPlaying ? "rgba(239,68,68,0.15)" : "rgba(0,240,255,0.12)",
                      border: replayPlaying ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(0,240,255,0.3)",
                      color: replayPlaying ? "#EF4444" : "#00F0FF",
                    }}>
                    {replayPlaying ? "⏸" : "▶"}
                  </button>
                  <button onClick={() => setReplayPos(100)}
                    className="w-7 h-7 rounded flex items-center justify-center text-[10px] transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748B" }}>
                    ⏭
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {["1x","2x","5x","10x"].map(s => (
                    <button key={s} onClick={() => setReplaySpeed(s)}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono transition-all"
                      style={{
                        background: replaySpeed === s ? "rgba(0,112,243,0.15)" : "transparent",
                        color: replaySpeed === s ? "#60A5FA" : "#475569",
                        border: replaySpeed === s ? "1px solid rgba(0,112,243,0.3)" : "1px solid rgba(255,255,255,0.05)",
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Click-away to close fault dropdown */}
      {faultOpen && <div className="fixed inset-0 z-30" onClick={() => setFaultOpen(false)} />}
    </div>
  );
}
