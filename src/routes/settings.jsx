import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";
import { useSettings, SCALE_FONT_PX } from "@/lib/settings-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { useLock } from "@/lib/lock-store";
import * as XLSX from "xlsx";
import { Download, Upload, FileSpreadsheet, Lock, Unlock, Trash2, } from "lucide-react";
import { cn } from "@/lib/utils";
export const Route = createFileRoute("/settings")({
    head: () => ({
        meta: [
            { title: "Settings — GV OS" },
            { name: "description", content: "Appearance, scale, data and preferences." },
        ],
    }),
    component: Settings,
});
const TABLES = [
    "tasks",
    "assignments",
    "projects",
    "projectTasks",
    "events",
    "notes",
    "sessions",
    "courses",
    "semesters",
];
async function snapshot() {
    const data = {};
    for (const t of TABLES)
        data[t] = await db[t].toArray();
    return data;
}
function download(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}
const SCALES = [
    { v: "compact", l: "Compact", desc: "Maximum density" },
    { v: "default", l: "Default", desc: "Balanced" },
    { v: "comfortable", l: "Comfortable", desc: "Roomier spacing" },
    { v: "large", l: "Large", desc: "Bigger text and cards" },
];
function Settings() {
    const { mode, setMode } = useTheme();
    const { scale, setScale, exportData, importData, appName, setAppName, appLogo, setAppLogo, labels, setLabels, } = useSettings();
    const { hasPin, setPin, clearPin, lock, hydrate } = useLock();
    const [newPin, setNewPin] = useState("");
    const [nameDraft, setNameDraft] = useState(appName);
    const [btechDraft, setBtechDraft] = useState(labels.btech);
    const [bsDraft, setBsDraft] = useState(labels.bs);
    const jsonInput = useRef(null);
    const xlsxInput = useRef(null);
    const logoInput = useRef(null);
    useEffect(() => hydrate(), [hydrate]);
    useEffect(() => setNameDraft(appName), [appName]);
    useEffect(() => { setBtechDraft(labels.btech); setBsDraft(labels.bs); }, [labels]);
    const onLogoFile = (f) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string")
                setAppLogo(reader.result);
        };
        reader.readAsDataURL(f);
    };
    const LOGO_PRESETS = ["GV", "🎓", "📘", "🧠", "⚡", "🚀", "🛰️", "✨"];
    const exportJSON = async () => {
        const data = await snapshot();
        const settings = exportData();
        download(`gv-os-backup-${new Date().toISOString().slice(0, 10)}.json`, new Blob([
            JSON.stringify({ version: 2, exportedAt: Date.now(), settings, ...data }, null, 2),
        ], { type: "application/json" }));
        toast.success("Backup downloaded", { duration: 1200 });
    };
    const exportXLSX = async () => {
        const data = await snapshot();
        const settings = exportData();
        const wb = XLSX.utils.book_new();
        for (const t of TABLES) {
            const ws = XLSX.utils.json_to_sheet(data[t] || []);
            XLSX.utils.book_append_sheet(wb, ws, t);
        }
        const settingsSheet = XLSX.utils.json_to_sheet([
            { key: "scale", value: String(settings.scale) },
            { key: "theme", value: String(settings.theme ?? "") },
            { key: "clocks", value: JSON.stringify(settings.clocks) },
        ]);
        XLSX.utils.book_append_sheet(wb, settingsSheet, "settings");
        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        download(`gv-os-${new Date().toISOString().slice(0, 10)}.xlsx`, new Blob([buf], { type: "application/octet-stream" }));
        toast.success("Excel exported", { duration: 1200 });
    };
    const importJSON = async (file) => {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            let count = 0;
            for (const t of TABLES) {
                if (Array.isArray(data[t])) {
                    const rows = data[t].map(({ id: _id, ...rest }) => rest);
                    await db[t].bulkAdd(rows);
                    count += rows.length;
                }
            }
            if (data.settings)
                importData(data.settings);
            toast.success(`Imported ${count} records`, { duration: 1500 });
        }
        catch (e) {
            console.error(e);
            toast.error("Could not import file");
        }
    };
    const importXLSX = async (file) => {
        try {
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf);
            let count = 0;
            for (const t of TABLES) {
                const ws = wb.Sheets[t];
                if (!ws)
                    continue;
                const rows = XLSX.utils.sheet_to_json(ws);
                const clean = rows.map(({ id: _id, ...rest }) => rest);
                await db[t].bulkAdd(clean);
                count += clean.length;
            }
            const ssheet = wb.Sheets["settings"];
            if (ssheet) {
                const rows = XLSX.utils.sheet_to_json(ssheet);
                const obj = {};
                for (const r of rows) {
                    try {
                        obj[r.key] = JSON.parse(r.value);
                    }
                    catch {
                        obj[r.key] = r.value;
                    }
                }
                importData(obj);
            }
            toast.success(`Imported ${count} records`, { duration: 1500 });
        }
        catch (e) {
            console.error(e);
            toast.error("Could not import file");
        }
    };
    const wipeAll = async () => {
        if (!confirm("Permanently erase ALL local GV OS data? This cannot be undone."))
            return;
        for (const t of TABLES)
            await db[t].clear();
        toast.success("All data erased", { duration: 1500 });
    };
    const saveNewPin = async () => {
        if (!/^\d{4,8}$/.test(newPin))
            return toast.error("PIN must be 4–8 digits");
        await setPin(newPin);
        setNewPin("");
        toast.success("PIN updated", { duration: 1200 });
    };
    return (<div className="mx-auto max-w-3xl space-y-5 p-5 md:p-7">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card className="p-5">
        <h2 className="text-sm font-semibold tracking-tight">Appearance</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          System follows your OS preference.
        </p>
        <div className="mt-3 flex gap-2" suppressHydrationWarning>
          {["light", "dark", "system"].map((m) => (<Button key={m} variant={mode === m ? "default" : "outline"} size="sm" onClick={() => setMode(m)} className="capitalize">
              {m}
            </Button>))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold tracking-tight">Branding</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Customize the application name and logo shown in the sidebar.
        </p>
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Application name" className="h-9"/>
            <Button size="sm" onClick={() => setAppName(nameDraft)}>Save name</Button>
          </div>
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              Logo
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {LOGO_PRESETS.map((g) => (<button key={g} onClick={() => setAppLogo(g)} className={cn("grid h-9 w-9 place-items-center rounded-lg border text-base transition", appLogo === g
                ? "border-primary bg-primary/10"
                : "border-border hover:border-border-strong")}>
                  {g}
                </button>))}
              <Button size="sm" variant="outline" onClick={() => logoInput.current?.click()} className="gap-1.5">
                <Upload className="h-3.5 w-3.5"/> Upload image
              </Button>
              <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onLogoFile(e.target.files[0])}/>
              {appLogo?.startsWith("data:") && (<div className="flex items-center gap-2">
                  <img src={appLogo} alt="" className="h-9 w-9 rounded-lg object-cover"/>
                  <Button size="sm" variant="ghost" onClick={() => setAppLogo("GV")}>
                    Reset
                  </Button>
                </div>)}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold tracking-tight">Academic Labels</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Rename your two academic programs. Applies across tasks, assignments,
          filters and statistics.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              Program 1 (was B.Tech)
            </p>
            <Input value={btechDraft} onChange={(e) => setBtechDraft(e.target.value)}/>
          </div>
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              Program 2 (was IITM BS)
            </p>
            <Input value={bsDraft} onChange={(e) => setBsDraft(e.target.value)}/>
          </div>
        </div>
        <div className="mt-3">
          <Button size="sm" onClick={() => setLabels({
            btech: btechDraft.trim() || "B.Tech",
            bs: bsDraft.trim() || "IITM BS",
        })}>
            Save labels
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold tracking-tight">Application scale</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Adjusts global text, spacing and card sizing. Applies immediately.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SCALES.map((s) => (<button key={s.v} onClick={() => setScale(s.v)} className={cn("rounded-xl border p-3 text-left transition", scale === s.v
                ? "border-primary bg-primary/10"
                : "border-border hover:border-border-strong")}>
              <p className="text-sm font-medium">{s.l}</p>
              <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                {SCALE_FONT_PX[s.v]}px
              </p>
            </button>))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold tracking-tight">Privacy &amp; PIN lock</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Protect GV OS with a numeric PIN. Stored locally as a SHA-256 hash on this
          device.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input type="password" inputMode="numeric" placeholder={hasPin ? "Change PIN" : "Set PIN (4–8 digits)"} value={newPin} onChange={(e) => setNewPin(e.target.value)} className="h-9 w-44"/>
          <Button size="sm" onClick={saveNewPin} className="gap-1.5">
            <Lock className="h-3.5 w-3.5"/> {hasPin ? "Update PIN" : "Set PIN"}
          </Button>
          {hasPin && (<>
              <Button size="sm" variant="outline" onClick={lock} className="gap-1.5">
                <Lock className="h-3.5 w-3.5"/> Lock now
              </Button>
              <Button size="sm" variant="ghost" onClick={() => clearPin()} className="gap-1.5 text-destructive">
                <Unlock className="h-3.5 w-3.5"/> Remove PIN
              </Button>
            </>)}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold tracking-tight">
          Data, backup &amp; import
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Backups include all records plus your preferences (theme, scale, clocks).
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button size="sm" onClick={exportJSON} className="gap-1.5">
            <Download className="h-3.5 w-3.5"/> Export JSON
          </Button>
          <Button size="sm" variant="outline" onClick={exportXLSX} className="gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5"/> Export Excel (.xlsx)
          </Button>
          <Button size="sm" variant="outline" onClick={() => jsonInput.current?.click()} className="gap-1.5">
            <Upload className="h-3.5 w-3.5"/> Import JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => xlsxInput.current?.click()} className="gap-1.5">
            <Upload className="h-3.5 w-3.5"/> Import Excel
          </Button>
          <input ref={jsonInput} type="file" accept=".json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])}/>
          <input ref={xlsxInput} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && importXLSX(e.target.files[0])}/>
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <Button size="sm" variant="ghost" onClick={wipeAll} className="gap-1.5 text-destructive">
            <Trash2 className="h-3.5 w-3.5"/> Erase all local data
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold tracking-tight">
          Desktop migration (Tauri)
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">
          GV OS is architected for a Tauri port — local IndexedDB data, no remote
          dependencies.
        </p>
      </Card>
    </div>);
}
