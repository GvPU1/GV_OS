import { useEffect, useRef, useState } from "react";
import { useLock } from "@/lib/lock-store";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
export function LockScreen() {
    const { locked, unlock } = useLock();
    const [pin, setPin] = useState("");
    const [shake, setShake] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (locked)
            setTimeout(() => ref.current?.focus(), 50);
    }, [locked]);
    if (!locked)
        return null;
    const submit = async (e) => {
        e.preventDefault();
        const ok = await unlock(pin);
        if (!ok) {
            setShake(true);
            setPin("");
            setTimeout(() => setShake(false), 400);
        }
    };
    return (<div className="fixed inset-0 z-[100] grid place-items-center bg-background/95 backdrop-blur-xl">
      <form onSubmit={submit} className={cn("flex w-full max-w-sm flex-col items-center gap-5", shake && "animate-pulse")}>
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-elegant">
          <Lock className="h-6 w-6"/>
        </div>
        <div className="text-center">
          <h1 className="text-lg font-semibold tracking-tight">GV OS Locked</h1>
          <p className="mt-1 text-xs text-muted-foreground">Enter your PIN to continue.</p>
        </div>
        <input ref={ref} type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" className="w-48 rounded-xl border border-border bg-surface px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-primary"/>
        <button type="submit" className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground">
          Unlock
        </button>
      </form>
    </div>);
}
