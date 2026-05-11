"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { submitContactRequest } from "@/app/liff/ai-chat/contact-actions";

export function ContactForm({ employeeId }: { employeeId?: string }) {
  const [date, setDate] = useState("");
  const [timeStart, setTimeStart] = useState("13:00");
  const [timeEnd, setTimeEnd] = useState("13:30");
  const [reason, setReason] = useState("");
  const [submitting, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function submit() {
    const fd = new FormData();
    if (employeeId) fd.set("employeeId", employeeId);
    fd.set("date", date);
    fd.set("timeStart", timeStart);
    fd.set("timeEnd", timeEnd);
    fd.set("reason", reason.trim());
    startTransition(async () => {
      const res = await submitContactRequest(fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setDone(true);
      toast.success(res.message);
    });
  }

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-3 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="text-base font-semibold text-navy-900">ส่งคำขอเรียบร้อย</h3>
          <p className="text-sm text-navy-500">
            หัวหน้าจะได้รับการ์ดใน LINE ระบบจะแจ้งกลับเมื่อมีการตอบรับ
          </p>
          <Button variant="outline" size="sm" onClick={() => setDone(false)}>
            ส่งคำขอใหม่
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold text-navy-900">ขอเข้าพบหัวหน้าโดยตรง</span>
          </div>
          <div className="space-y-2">
            <Label>วันที่</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>เวลาเริ่ม</Label>
              <Input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>เวลาสิ้นสุด</Label>
              <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>เหตุผล / สิ่งที่อยากปรึกษา</Label>
            <Textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุหัวข้อที่ต้องการปรึกษา เพื่อให้หัวหน้าเตรียมข้อมูลก่อนเจอ"
            />
          </div>
          <Button size="lg" className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            ส่งคำขอ
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-xs text-navy-500">
          <div className="flex items-center justify-between">
            <span className="font-semibold uppercase tracking-wider text-navy-500">โฟลว์</span>
            <Badge variant="info">3 ขั้น</Badge>
          </div>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>คุณส่งคำขอ → หัวหน้าได้รับการ์ดใน LINE</li>
            <li>หัวหน้ากดยินยอม / ไม่สะดวก (ระบุเหตุผล)</li>
            <li>คุณได้รับผลลัพธ์เป็นการ์ดใน LINE</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
