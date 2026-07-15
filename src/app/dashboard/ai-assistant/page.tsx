import { WorkforceAssistantChat } from "@/components/dashboard/workforce-assistant";
import { DashboardTopbar } from "@/components/dashboard/topbar";

export default function AiAssistantPage() {
  return (
    <>
      <DashboardTopbar
        title="Workforce Assistant"
        subtitle="ถามข้อมูลกำลังคนแบบหลายรอบ สร้างรายงานจาก JSON ที่ตรวจ schema แล้ว และอ้างอิงเวลา Asia/Bangkok"
      />
      <main className="min-h-0 flex-1 px-6 py-6">
        <WorkforceAssistantChat mode="page" />
      </main>
    </>
  );
}
