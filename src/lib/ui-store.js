import { create } from "zustand";
export const useUiStore = create((set) => ({
    cmdOpen: false,
    captureOpen: false,
    captureKind: "task",
    openCmd: () => set({ cmdOpen: true }),
    closeCmd: () => set({ cmdOpen: false }),
    openCapture: (kind = "task") => set({ captureOpen: true, captureKind: kind }),
    closeCapture: () => set({ captureOpen: false }),
}));
