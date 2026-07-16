"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { WorkforceAssistantLauncher } from "@/components/dashboard/workforce-assistant";

interface DashboardNavigationState {
  collapsed: boolean;
  mobileOpen: boolean;
  toggleCollapsed: () => void;
  openMobile: () => void;
  closeMobile: () => void;
}

const DashboardNavigationContext = createContext<DashboardNavigationState | null>(null);
const STORAGE_KEY = "ec-aihr-dashboard-sidebar-collapsed";

export function useDashboardNavigation(): DashboardNavigationState {
  const context = useContext(DashboardNavigationContext);
  if (!context) throw new Error("DashboardShell is missing.");
  return context;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  const navigation = useMemo(
    () => ({
      collapsed,
      mobileOpen,
      toggleCollapsed: () => setCollapsed((current) => !current),
      openMobile: () => setMobileOpen(true),
      closeMobile: () => setMobileOpen(false),
    }),
    [collapsed, mobileOpen],
  );

  return (
    <DashboardNavigationContext.Provider value={navigation}>
      <div className="flex min-h-screen bg-navy-50/60">
        <DashboardSidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        <WorkforceAssistantLauncher />
      </div>
    </DashboardNavigationContext.Provider>
  );
}
