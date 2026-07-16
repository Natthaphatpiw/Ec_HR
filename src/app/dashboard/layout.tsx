import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { WorkforceAssistantProvider } from "@/components/dashboard/workforce-assistant";
import { isDashboardOwnerAuthorized } from "@/lib/dashboard-session";
import {
  loadDemoWorkforceDataset,
  shouldUseDemoWorkforceSource,
} from "@/lib/demo-workforce";
import { currentBangkokDate } from "@/lib/workforce-assistant/dates";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await isDashboardOwnerAuthorized())) redirect("/login");
  const referenceDate = shouldUseDemoWorkforceSource()
    ? loadDemoWorkforceDataset().period.endDate
    : currentBangkokDate();

  return (
    <WorkforceAssistantProvider referenceDate={referenceDate}>
      <DashboardShell>{children}</DashboardShell>
    </WorkforceAssistantProvider>
  );
}
