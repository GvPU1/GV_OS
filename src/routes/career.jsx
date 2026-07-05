import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Plus, Pencil, Trash2, Briefcase, Award, ExternalLink, } from "lucide-react";
import { db, } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SkillDialog } from "@/components/skill-dialog";
import { CertificationDialog } from "@/components/certification-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
export const Route = createFileRoute("/career")({
    head: () => ({
        meta: [
            { title: "Career Hub — GV OS" },
            { name: "description", content: "Track skills and certifications." },
        ],
    }),
    component: CareerHub,
});
function CareerHub() {
    const [tab, setTab] = useState("skills");
    return (<div className="mx-auto max-w-7xl space-y-5 p-5 md:p-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Career Hub</h1>
        <p className="text-sm text-muted-foreground">
          Skills you’re developing and certifications you’re pursuing.
        </p>
      </div>

      <div className="inline-flex rounded-xl border border-border bg-surface/40 p-1">
        <TabButton active={tab === "skills"} onClick={() => setTab("skills")}>
          <Briefcase className="h-3.5 w-3.5"/> Skills
        </TabButton>
        <TabButton active={tab === "certifications"} onClick={() => setTab("certifications")}>
          <Award className="h-3.5 w-3.5"/> Certifications
        </TabButton>
      </div>

      {tab === "skills" ? <SkillsSection /> : <CertificationsSection />}
    </div>);
}
function TabButton({ active, onClick, children, }) {
    return (<button onClick={onClick} className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition", active
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground")}>
      {children}
    </button>);
}
const LEVEL_LABEL = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    expert: "Expert",
};
function SkillsSection() {
    const skills = useLiveQuery(() => db.skills.filter((s) => !s.archived).toArray(), [], []);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    return (<div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {(skills || []).length} skill{(skills || []).length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={() => {
            setEditing(null);
            setOpen(true);
        }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5"/> Add skill
        </Button>
      </div>
      {(!skills || skills.length === 0) ? (<Card className="flex flex-col items-center gap-3 p-12 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Briefcase className="h-5 w-5"/>
          </div>
          <h2 className="text-base font-semibold">No skills yet</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Track skills you’re developing with current and target levels.
          </p>
        </Card>) : (<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((s) => (<SkillCard key={s.id} skill={s} onEdit={() => {
                    setEditing(s);
                    setOpen(true);
                }}/>))}
        </div>)}
      <SkillDialog open={open} onOpenChange={setOpen} skill={editing}/>
    </div>);
}
function SkillCard({ skill, onEdit }) {
    return (<Card className="group p-4 transition hover:border-border-strong">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onEdit} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold">{skill.name}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{skill.category}</p>
        </button>
        <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3 w-3"/>
          </Button>
          <ConfirmDelete title="Delete this skill?" onConfirm={() => db.skills.delete(skill.id)} trigger={<Button variant="ghost" size="icon" className="h-7 w-7">
                <Trash2 className="h-3 w-3"/>
              </Button>}/>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-muted/40 p-2">
          <p className="uppercase tracking-wider text-muted-foreground">Current</p>
          <p className="mt-0.5 font-medium">{LEVEL_LABEL[skill.currentLevel]}</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2">
          <p className="uppercase tracking-wider text-primary/80">Target</p>
          <p className="mt-0.5 font-medium text-primary">
            {LEVEL_LABEL[skill.targetLevel]}
          </p>
        </div>
      </div>
    </Card>);
}
const CERT_STATUS_LABEL = {
    planned: "Planned",
    in_progress: "In progress",
    scheduled: "Scheduled",
    completed: "Completed",
    expired: "Expired",
};
const CERT_STATUS_BAR = {
    planned: "bg-slate-accent",
    in_progress: "bg-info",
    scheduled: "bg-warning",
    completed: "bg-success",
    expired: "bg-critical",
};
function CertificationsSection() {
    const certs = useLiveQuery(() => db.certifications.filter((c) => !c.archived).toArray(), [], []);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    return (<div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {(certs || []).length} certification{(certs || []).length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={() => {
            setEditing(null);
            setOpen(true);
        }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5"/> Add certification
        </Button>
      </div>
      {(!certs || certs.length === 0) ? (<Card className="flex flex-col items-center gap-3 p-12 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Award className="h-5 w-5"/>
          </div>
          <h2 className="text-base font-semibold">No certifications yet</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Plan, track and showcase certifications you’re working on.
          </p>
        </Card>) : (<div className="flex flex-col gap-2.5">
          {certs.map((c) => (<CertRow key={c.id} cert={c} onEdit={() => {
                    setEditing(c);
                    setOpen(true);
                }}/>))}
        </div>)}
      <CertificationDialog open={open} onOpenChange={setOpen} certification={editing}/>
    </div>);
}
function CertRow({ cert, onEdit, }) {
    return (<Card className="group flex items-center gap-4 p-4 transition hover:border-border-strong hover:shadow-sm">
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold">{cert.name}</p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
          {cert.provider}
        </p>
      </button>

      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {CERT_STATUS_LABEL[cert.status]}
          </span>
          <span className={cn("h-1.5 w-24 rounded-full transition-all", CERT_STATUS_BAR[cert.status])}/>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5"/>
          </Button>
          <ConfirmDelete title="Delete this certification?" onConfirm={() => db.certifications.delete(cert.id)} trigger={<Button variant="ghost" size="icon" className="h-7 w-7">
                <Trash2 className="h-3.5 w-3.5"/>
              </Button>}/>
          {cert.url && (<a href={cert.url} target="_blank" rel="noreferrer" className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground">
              <ExternalLink className="h-3.5 w-3.5"/>
            </a>)}
        </div>
      </div>
    </Card>);
}
