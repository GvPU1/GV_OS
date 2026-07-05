import { QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, useRouter, useRouterState, Link, } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";
import { useTheme } from "@/lib/theme";
import { AppShell } from "@/components/app-shell";
import { CommandPalette } from "@/components/command-palette";
import { QuickCapture } from "@/components/quick-capture";
import { FabCapture } from "@/components/fab-capture";
import { LockScreen } from "@/components/lock-screen";
import { useLock } from "@/lib/lock-store";
import { useSettings } from "@/lib/settings-store";
import { useTimer } from "@/lib/timer";
function NotFoundComponent() {
    return (<div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-semibold tracking-tight text-foreground">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We couldn't find that page.
        </p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Back to Dashboard
        </Link>
      </div>
    </div>);
}
function ErrorComponent({ error, reset }) {
    const router = useRouter();
    useEffect(() => {
        reportError(error, { boundary: "tanstack_root_error_component" });
    }, [error]);
    return (<div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => {
            router.invalidate();
            reset();
        }} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Try again
          </button>
        </div>
      </div>
    </div>);
}
export const Route = createRootRouteWithContext()({
    head: () => ({
        meta: [
            { charSet: "utf-8" },
            { name: "viewport", content: "width=device-width, initial-scale=1" },
            { title: "GV OS — Personal Productivity Operating System" },
            {
                name: "description",
                content: "GV OS is a desktop-first productivity OS unifying academics, tasks, projects, study sessions and knowledge in one Apple-inspired workspace.",
            },
            { property: "og:title", content: "GV OS" },
            {
                property: "og:description",
                content: "Your unified personal productivity operating system.",
            },
        ],
        links: [{ rel: "stylesheet", href: appCss }],
    }),
    // NOTE: this app renders client-side only via <RouterProvider>, not via
    // @tanstack/react-start SSR. `shellComponent` (and <HeadContent/>/<Scripts/>)
    // are only ever invoked by Start's server render pipeline — they were dead
    // code here and have been removed. document.title is now synced manually
    // from route head() data in RootComponent below.
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
});
function RootComponent() {
    const { queryClient } = Route.useRouteContext();
    const apply = useTheme((s) => s.apply);
    const hydrateTheme = useTheme((s) => s.hydrate);
    const hydrateLock = useLock((s) => s.hydrate);
    const hydrateSettings = useSettings((s) => s.hydrate);
    useEffect(() => {
        hydrateTheme();
        hydrateSettings();
        hydrateLock();
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const h = () => apply();
        mq.addEventListener("change", h);
        return () => mq.removeEventListener("change", h);
    }, [apply, hydrateLock, hydrateSettings, hydrateTheme]);
    // Keep document.title in sync with the active route's head() meta.
    const matches = useRouterState({ select: (s) => s.matches });
    useEffect(() => {
        for (let i = matches.length - 1; i >= 0; i--) {
            const titleEntry = matches[i].meta?.find((m) => "title" in m);
            if (titleEntry?.title) {
                document.title = titleEntry.title;
                break;
            }
        }
    }, [matches]);
    // Global 1s timer tick — keeps Pomodoro running across every route.
    useEffect(() => {
        const id = window.setInterval(() => useTimer.getState().tick(), 1000);
        return () => window.clearInterval(id);
    }, []);
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    const isFocus = pathname.startsWith("/focus");
    return (<QueryClientProvider client={queryClient}>
      {isFocus ? (<Outlet />) : (<AppShell>
          <Outlet />
        </AppShell>)}
      {!isFocus && <FabCapture />}
      <CommandPalette />
      <QuickCapture />
      <LockScreen />
      <Toaster position="bottom-right" toastOptions={{
            className: "!bg-popover !text-popover-foreground !border !border-border !rounded-xl",
        }}/>
    </QueryClientProvider>);
}
