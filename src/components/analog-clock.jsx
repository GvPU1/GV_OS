import { useEffect, useState } from "react";
/** Pure SVG analog clock. Renders deterministically on the server (12:00) and
 * starts ticking on the client after mount to avoid hydration mismatches. */
export function AnalogClock({ timezone, label, size = 150 }) {
    const [now, setNow] = useState(null);
    useEffect(() => {
        setNow(new Date());
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, []);
    let h = 0, m = 0, s = 0, timeText = "—";
    if (now) {
        const parts = new Intl.DateTimeFormat([], {
            timeZone: timezone || undefined,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).formatToParts(now);
        h = Number(parts.find((p) => p.type === "hour")?.value || 0);
        m = Number(parts.find((p) => p.type === "minute")?.value || 0);
        s = Number(parts.find((p) => p.type === "second")?.value || 0);
        timeText = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    const secondAngle = s * 6;
    const minuteAngle = m * 6 + s * 0.1;
    const hourAngle = (h % 12) * 30 + m * 0.5;
    const r = size / 2;
    return (<div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm" suppressHydrationWarning>
        <circle cx={r} cy={r} r={r - 2} fill="var(--color-surface)" stroke="var(--color-border-strong)" strokeWidth={1.5}/>
        {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            const inner = r - (i % 3 === 0 ? 10 : 6);
            const outer = r - 2;
            return (<line key={i} x1={r + Math.sin(a) * inner} y1={r - Math.cos(a) * inner} x2={r + Math.sin(a) * outer} y2={r - Math.cos(a) * outer} stroke="var(--color-muted-foreground)" strokeWidth={i % 3 === 0 ? 2 : 1} strokeLinecap="round" opacity={i % 3 === 0 ? 0.9 : 0.45}/>);
        })}
        {/* hour */}
        <line x1={r} y1={r} x2={r} y2={r - size * 0.27} stroke="var(--color-foreground)" strokeWidth={3} strokeLinecap="round" transform={`rotate(${hourAngle} ${r} ${r})`}/>
        {/* minute */}
        <line x1={r} y1={r} x2={r} y2={r - size * 0.38} stroke="var(--color-foreground)" strokeWidth={2} strokeLinecap="round" transform={`rotate(${minuteAngle} ${r} ${r})`}/>
        {/* second */}
        <line x1={r} y1={r + size * 0.08} x2={r} y2={r - size * 0.42} stroke="var(--color-primary)" strokeWidth={1.25} strokeLinecap="round" transform={`rotate(${secondAngle} ${r} ${r})`}/>
        <circle cx={r} cy={r} r={3.5} fill="var(--color-primary)"/>
      </svg>
      <div className="text-center">
        <p className="text-sm font-medium">{label}</p>
        <p className="font-mono text-[11px] tabular-nums text-muted-foreground" suppressHydrationWarning>
          {timeText} · {timezone || "Local"}
        </p>
      </div>
    </div>);
}
