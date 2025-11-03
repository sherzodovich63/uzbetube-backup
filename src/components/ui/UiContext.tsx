"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  ReactNode,
} from "react";

type UiState = {
  isSidebarOpen: boolean;
};

type UiActions = {
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
};

const UiContext = createContext<(UiState & UiActions) | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const openSidebar = () => setIsSidebarOpen(true);
  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleSidebar = () => setIsSidebarOpen((v) => !v);

  // ESC -> close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Scroll lock when sidebar is open (mobile drawer UX)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement; // or document.body
    if (isSidebarOpen) {
      el.classList.add("overflow-hidden");
    } else {
      el.classList.remove("overflow-hidden");
    }
    return () => el.classList.remove("overflow-hidden");
  }, [isSidebarOpen]);

  const value = useMemo(
    () => ({ isSidebarOpen, openSidebar, closeSidebar, toggleSidebar }),
    [isSidebarOpen]
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi must be used inside <UiProvider>");
  return ctx;
}
