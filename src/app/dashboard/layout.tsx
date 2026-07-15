import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import {
  WorkforceAssistantLauncher,
  WorkforceAssistantProvider,
} from "@/components/dashboard/workforce-assistant";
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
      <div className="flex min-h-screen bg-navy-50/40">
        <DashboardSidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        <WorkforceAssistantLauncher />
      </div>
    </WorkforceAssistantProvider>
  );
}
