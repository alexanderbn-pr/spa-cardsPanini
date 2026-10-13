import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

interface UiState {
  /** null = closed; array = open with messages. Never booleans — the modal lists them. */
  errorMessages: string[] | null;
  openError: (messages: string[]) => void;
  closeError: () => void;
}

/**
 * Global feedback store. Components MUST read through a field selector
 * (`useUiStore(s => s.errorMessages)` + useShallow) — never the whole store
 * (zustand-5 rule): an open modal must not re-render unrelated consumers.
 */
export const useUiStore = create<UiState>()((set) => ({
  errorMessages: null,
  openError: (messages) => set({ errorMessages: messages }),
  closeError: () => set({ errorMessages: null }),
}));

/** Field-selector hook: shallow array compare avoids re-renders on identical messages. */
export function useErrorMessages(): string[] | null {
  return useUiStore(useShallow((state) => state.errorMessages));
}
