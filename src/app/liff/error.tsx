"use client";

import { useRouter } from "next/navigation";
import { LiffHeader } from "@/components/liff/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LiffError({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <>
      <LiffHeader />
      <main className="px-4 pb-6 pt-3">
        <Card>
          <CardContent className="space-y-3 p-6 text-center" role="alert">
            <h2 className="text-base font-semibold text-orange-600">โหลดข้อมูลไม่สำเร็จ</h2>
            <p className="text-sm text-navy-500">กรุณาลองใหม่ หากยังใช้งานไม่ได้ให้ติดต่อผู้ดูแลระบบ</p>
            <Button type="button" variant="outline" onClick={() => {
              router.refresh();
              reset();
            }}>
              ลองใหม่
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
