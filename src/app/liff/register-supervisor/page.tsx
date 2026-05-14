import { LiffHeader } from "@/components/liff/header";
import { SupervisorRegisterForm } from "@/components/liff/supervisor-register-form";

export default function RegisterSupervisorPage() {
  return (
    <>
      <LiffHeader title="ลงทะเบียนหัวหน้า" />
      <main className="px-4 pb-10 pt-3">
        <div className="mb-4 rounded-2xl bg-navy-900 p-5 text-white">
          <h2 className="text-lg font-semibold">ลงทะเบียนหัวหน้างาน</h2>
          <p className="mt-1 text-sm text-navy-300">
            เปิดบัญชีหัวหน้า / เจ้าของกิจการ พร้อมระบุลูกน้องในทีม (ภายหลังเพิ่มเพิ่มได้)
          </p>
        </div>
        <SupervisorRegisterForm />
      </main>
    </>
  );
}
