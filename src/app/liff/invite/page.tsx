import { LiffHeader } from "@/components/liff/header";
import { guardLiffPage } from "@/components/liff/page-guard";
import { InvitePanel } from "@/components/liff/invite-panel";
import { Card, CardContent } from "@/components/ui/card";
import { getOrCreateReusableInvite, getOrganization } from "@/lib/data";

const TITLE = "เชิญพนักงานเข้าทีม";

export default async function LiffInvitePage() {
  const guard = await guardLiffPage({
    title: TITLE,
    liffId: process.env.NEXT_PUBLIC_LIFF_ID_TEAM ?? process.env.NEXT_PUBLIC_LIFF_ID_ATTENDANCE,
  });
  if (!guard.ok) return guard.view;
  const me = guard.employee;

  if (!me.is_supervisor) {
    return (
      <>
        <LiffHeader title={TITLE} />
        <main className="px-4 pb-6 pt-3">
          <Card>
            <CardContent className="space-y-2 p-8 text-center">
              <h3 className="text-base font-semibold text-navy-900">หน้านี้สำหรับหัวหน้างาน</h3>
              <p className="text-sm text-navy-500">
                เฉพาะหัวหน้า / เจ้าของกิจการเท่านั้นที่สร้างลิงก์เชิญพนักงานได้
              </p>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  const [org, invite] = await Promise.all([
    getOrganization(me.org_id),
    getOrCreateReusableInvite(me.org_id, me.id),
  ]);
  const businessName = org.business_name ?? org.name;

  return (
    <>
      <LiffHeader title={TITLE} />
      <main className="px-4 pb-10 pt-3">
        <div className="mb-4 rounded-2xl bg-navy-900 p-5 text-white">
          <h2 className="text-lg font-semibold">{TITLE}</h2>
          <p className="mt-1 text-sm text-navy-300">
            แชร์ QR / ลิงก์นี้ให้พนักงานสแกนเพื่อเข้าร่วม {businessName} — คุณจะได้อนุมัติแต่ละคนทาง LINE
          </p>
        </div>
        <InvitePanel token={invite.token} businessName={businessName} />
      </main>
    </>
  );
}
