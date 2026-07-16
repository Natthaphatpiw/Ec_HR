import { WorkforceAssistantChat } from "@/components/dashboard/workforce-assistant";
import { DashboardTopbar } from "@/components/dashboard/topbar";

export default function AiAssistantPage() {
  return (
    <>
      <DashboardTopbar
        title="ผู้ช่วย AI สำหรับงานบุคคล"
        subtitle="ถามข้อมูลกำลังคน วิเคราะห์แนวโน้ม และสร้างรายงานพร้อมกราฟ"
      />
      <main className="min-h-0 flex-1 px-3 py-3 sm:px-6 sm:py-6">
        <WorkforceAssistantChat mode="page" />
      </main>
    </>
  );
}
