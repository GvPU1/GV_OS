import { useEffect, useState } from "react";
import { useSettings } from "@/lib/settings-store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
const ZONES = [
    { label: "Local Time", tz: "" },
    { label: "Qatar", tz: "Asia/Qatar" },
    { label: "India", tz: "Asia/Kolkata" },
    { label: "Germany", tz: "Europe/Berlin" },
    { label: "UTC", tz: "UTC" },
    { label: "London", tz: "Europe/London" },
    { label: "New York", tz: "America/New_York" },
    { label: "Los Angeles", tz: "America/Los_Angeles" },
    { label: "Tokyo", tz: "Asia/Tokyo" },
    { label: "Singapore", tz: "Asia/Singapore" },
];
const LOCAL_SENTINEL = "__local__";
export function DigitalClock() {
    const tz = useSettings((s) => s.digitalClockTz);
    const setTz = useSettings((s) => s.setDigitalClockTz);
    const [now, setNow] = useState(null);
    useEffect(() => {
        setNow(new Date());
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, []);
    const timeFmt = new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: tz || undefined,
    });
    const dateFmt = new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: tz || undefined,
    });
    const label = ZONES.find((z) => z.tz === tz)?.label || "Local Time";
    const selectValue = tz || LOCAL_SENTINEL;
    return (<div className="flex h-full flex-col justify-center gap-4 p-2">
      <div className="text-center">
        <p className="font-mono text-5xl font-semibold tabular-nums tracking-tight md:text-6xl" suppressHydrationWarning>
          {now ? timeFmt.format(now) : "--:--:--"}
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground" suppressHydrationWarning>
          {now ? dateFmt.format(now) : label}
        </p>
      </div>
      <div className="mx-auto w-full max-w-[220px]">
        <Select value={selectValue} onValueChange={(v) => setTz(v === LOCAL_SENTINEL ? "" : v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={label}/>
          </SelectTrigger>
          <SelectContent>
            {ZONES.map((z) => (<SelectItem key={z.tz || LOCAL_SENTINEL} value={z.tz || LOCAL_SENTINEL}>
                {z.label}
              </SelectItem>))}
          </SelectContent>
        </Select>
      </div>
    </div>);
}
