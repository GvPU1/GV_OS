import { Plus } from "lucide-react";
import { useUiStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
export function FabCapture() {
    const openCapture = useUiStore((s) => s.openCapture);
    return (<button onClick={() => openCapture()} aria-label="Quick capture" title="Quick capture (⌘N)" className={cn("fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full", "bg-primary text-primary-foreground shadow-lg shadow-primary/25", "transition-all duration-200 ease-out hover:scale-105 hover:shadow-xl", "active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background")}>
      <Plus className="h-5 w-5" strokeWidth={2.25}/>
    </button>);
}
