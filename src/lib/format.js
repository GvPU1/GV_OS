import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from "date-fns";
export function fmtDay(ts) {
    const d = new Date(ts);
    if (isToday(d))
        return "Today";
    if (isTomorrow(d))
        return "Tomorrow";
    if (isYesterday(d))
        return "Yesterday";
    return format(d, "EEE, MMM d");
}
/** Premium long-form date: "June 25, 2026" */
export function fmtLongDate(ts) {
    return format(new Date(ts), "MMMM d, yyyy");
}
export function fmtTime(ts) {
    return format(new Date(ts), "HH:mm");
}
export function fmtRelative(ts) {
    return formatDistanceToNowStrict(new Date(ts), { addSuffix: true });
}
/* ──────────────────────────────────────────────────────────────────
 * Design System v2 — semantic color helpers
 *   low      → emerald (success)
 *   medium   → yellow  (medium token)
 *   high     → orange  (high token)
 *   critical → crimson (critical token)
 * ────────────────────────────────────────────────────────────────── */
export function priorityTone(p) {
    switch (p) {
        case "critical": return "text-critical";
        case "high": return "text-high";
        case "medium": return "text-medium";
        case "low": return "text-success";
        default: return "text-muted-foreground";
    }
}
export function priorityChip(p) {
    switch (p) {
        case "critical": return "bg-critical/15 text-critical";
        case "high": return "bg-high/15 text-high";
        case "medium": return "bg-medium/20 text-medium";
        case "low": return "bg-success/15 text-success";
        default: return "bg-muted text-muted-foreground";
    }
}
export function priorityAccent(p) {
    switch (p) {
        case "critical": return "before:bg-critical";
        case "high": return "before:bg-high";
        case "medium": return "before:bg-medium";
        case "low": return "before:bg-success";
        default: return "before:bg-muted";
    }
}
/* Assignment status — Not Started: amber · In Progress: sapphire ·
 * Submitted / Completed: emerald · Overdue handled at call site. */
export function assignmentStatusChip(s) {
    switch (s) {
        case "in_progress": return "bg-info/15 text-info";
        case "submitted":
        case "completed": return "bg-success/15 text-success";
        case "not_started":
        default: return "bg-warning/15 text-warning";
    }
}
/* Task status — Design v2 */
export function taskStatusChip(s) {
    switch (s) {
        case "in_progress": return "bg-info/15 text-info";
        case "done": return "bg-success/15 text-success";
        case "deferred": return "bg-slate-accent/15 text-slate-accent";
        case "todo":
        default: return "bg-warning/15 text-warning";
    }
}
/* Project status */
export function projectStatusChip(s) {
    switch (s) {
        case "active": return "bg-info/15 text-info";
        case "paused":
        case "on_hold": return "bg-warning/15 text-warning";
        case "completed": return "bg-success/15 text-success";
        case "cancelled": return "bg-critical/15 text-critical";
        case "planned":
        default: return "bg-slate-accent/15 text-slate-accent";
    }
}
/* Idea status */
export function ideaStatusChip(s) {
    switch (s) {
        case "evaluating": return "bg-warning/15 text-warning";
        case "planned": return "bg-info/15 text-info";
        case "active": return "bg-success/15 text-success";
        case "complete": return "bg-success/15 text-success";
        case "captured":
        default: return "bg-slate-accent/15 text-slate-accent";
    }
}
/* Certification status */
export function certStatusChip(s) {
    switch (s) {
        case "in_progress": return "bg-info/15 text-info";
        case "scheduled": return "bg-warning/15 text-warning";
        case "completed": return "bg-success/15 text-success";
        case "expired": return "bg-critical/15 text-critical";
        case "planned":
        default: return "bg-slate-accent/15 text-slate-accent";
    }
}
/* Deadline tone — emerald done, crimson overdue, amber upcoming */
export function deadlineTone(ts, statusDone) {
    if (!ts)
        return "text-muted-foreground";
    if (statusDone)
        return "text-success";
    if (ts < Date.now())
        return "text-critical";
    return "text-warning";
}
