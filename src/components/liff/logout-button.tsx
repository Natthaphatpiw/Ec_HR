"use client";
import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resetLiffSession } from "@/lib/liff-client";
export function LiffLogoutButton() {
  const [pending, setPending] = useState(false);
  async function logout() {
    setPending(true);
    try {
      await resetLiffSession();
      window.location.assign("/liff/signed-out");
    } catch {
      toast.error("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
      setPending(false);
    }
  }
  return <Button type="button" variant="ghost" size="icon" disabled={pending} onClick={logout} aria-label="ออกจากระบบ" title="ออกจากระบบ">
    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
  </Button>;
}
