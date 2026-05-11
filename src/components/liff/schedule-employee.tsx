"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, Calendar, ChevronLeft, ChevronRight, Lock, Plane, Plus, Timer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  removeScheduleEntry,
  saveScheduleEntry,
} from "@/app/liff/my-attendance/schedule/actions";
import type { ScheduleEntry, ScheduleEntryType } from "@/lib/types";

const TYPES: { key: ScheduleEntryType; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "work",      label: "ทำงาน", icon: <Briefcase className="h-3.5 w-3.5" />, color: "bg-navy-50 text-navy-700 border-navy-200" },
  { key: "overtime",  label: "OT",    icon: <Timer className="h-3.5 w-3.5" />,    color: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "leave",     label: "ลา",    icon: <Plane className="h-3.5 w-3.5" />,    color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

const DAY_LABELS = ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "อาทิตย์"];
const DAY_LABELS_SHORT = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return `${d.getUTCDate()}/${(d.getUTCMonth() + 1).toString().padStart(2, "0")}`;
}

interface CellSelection {
  date: string;
  entryType: ScheduleEntryType;
  existing?: ScheduleEntry;
}

export function EmployeeSchedule({
  employeeId,
  employeeName,
  weekStart,
  entries,
}: {
  employeeId: string;
  employeeName: string;
  weekStart: string;
  entries: ScheduleEntry[];
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useState<CellSelection | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Lookup map: date|type → entry
  const byCell = useMemo(() => {
    const m = new Map<string, ScheduleEntry>();
    for (const e of entries) m.set(`${e.date}|${e.entry_type}`, e);
    return m;
  }, [entries]);

  function navigateWeek(delta: number) {
    const next = addDays(weekStart, delta * 7);
    const params = new URLSearchParams(search.toString());
    params.set("week", next);
    router.push(`/liff/my-attendance/schedule?${params.toString()}`);
  }

  function open(date: string, type: ScheduleEntryType) {
    const existing = byCell.get(`${date}|${type}`);
    if (existing?.is_supervisor_override) {
      toast.info("กล่องนี้ถูกล็อกโดยหัวหน้า ไม่สามารถแก้ไขได้");
      return;
    }
    setSelection({ date, entryType: type, existing });
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-navy-500">ตารางงานของฉัน</div>
              <div className="mt-0.5 text-sm font-semibold text-navy-900">{employeeName}</div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-xs text-navy-700">
                {fmtDateShort(weekStart)} – {fmtDateShort(addDays(weekStart, 6))}
              </div>
              <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] gap-1.5">
            <div></div>
            {days.map((d, i) => (
              <div key={d} className="text-center text-[10px] font-medium text-navy-500">
                <div>{DAY_LABELS_SHORT[i]}</div>
                <div className="text-navy-400">{fmtDateShort(d)}</div>
              </div>
            ))}

            {TYPES.map((row) => (
              <RowGroup key={row.key} label={row.label} icon={row.icon}>
                {days.map((d) => {
                  const entry = byCell.get(`${d}|${row.key}`);
                  return (
                    <Cell
                      key={`${d}-${row.key}`}
                      entry={entry}
                      colorClass={row.color}
                      onClick={() => open(d, row.key)}
                    />
                  );
                })}
              </RowGroup>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 text-[11px] text-navy-500">
          แตะกล่องเพื่อกรอกชั่วโมง · กล่องที่มี <Lock className="inline h-3 w-3 text-orange-500" /> ถูกล็อกโดยหัวหน้า
        </CardContent>
      </Card>

      <CellEditDialog
        selection={selection}
        onClose={() => setSelection(null)}
        onSave={(hours, notes) => {
          if (!selection) return;
          startTransition(async () => {
            const res = await saveScheduleEntry({
              employeeId,
              date: selection.date,
              entryType: selection.entryType,
              hours,
              notes,
              byId: employeeId,
            });
            if (!res.ok) {
              toast.error(res.message ?? "บันทึกไม่สำเร็จ");
              return;
            }
            toast.success("บันทึกแล้ว");
            setSelection(null);
            router.refresh();
          });
        }}
        onDelete={() => {
          if (!selection?.existing) return;
          startTransition(async () => {
            await removeScheduleEntry({
              employeeId,
              date: selection.date,
              entryType: selection.entryType,
              byId: employeeId,
            });
            toast.success("ลบแล้ว");
            setSelection(null);
            router.refresh();
          });
        }}
        pending={pending}
      />
    </>
  );
}

// =========================================================================
// Cell + Row helpers
// =========================================================================

function RowGroup({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center gap-1 text-[10px] font-semibold text-navy-700">
        {icon}
        {label}
      </div>
      {children}
    </>
  );
}

function Cell({
  entry,
  colorClass,
  onClick,
}: {
  entry: ScheduleEntry | undefined;
  colorClass: string;
  onClick: () => void;
}) {
  const filled = entry && entry.hours > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex aspect-square min-h-[44px] flex-col items-center justify-center rounded-md border text-[11px] transition-colors",
        filled ? colorClass : "border-dashed border-navy-200 bg-white text-navy-400 hover:border-orange-300 hover:bg-orange-50/30",
      )}
    >
      {filled ? (
        <>
          <span className="font-bold tabular-nums">{entry!.hours}</span>
          <span className="text-[9px] opacity-70">ชม.</span>
          {entry?.is_supervisor_override && (
            <Lock className="absolute right-1 top-1 h-2.5 w-2.5 text-orange-600" />
          )}
        </>
      ) : (
        <Plus className="h-4 w-4" />
      )}
    </button>
  );
}

// =========================================================================
// Edit dialog
// =========================================================================

function CellEditDialog({
  selection,
  onClose,
  onSave,
  onDelete,
  pending,
}: {
  selection: CellSelection | null;
  onClose: () => void;
  onSave: (hours: number, notes: string | null) => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");

  // Reset when opening with a new selection
  const key = selection ? `${selection.date}|${selection.entryType}` : "";
  if (selection && key !== `${selection.date}|${selection.entryType}-init`) {
    // noop — we control state explicitly via the onOpenChange below
  }

  return (
    <Dialog
      open={!!selection}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
        } else if (selection) {
          setHours(selection.existing ? String(selection.existing.hours) : (selection.entryType === "work" ? "8" : "1"));
          setNotes(selection.existing?.notes ?? "");
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {selection?.entryType === "work" && "ทำงานปกติ"}
            {selection?.entryType === "overtime" && "ทำโอที"}
            {selection?.entryType === "leave" && "ลางาน"}
          </DialogTitle>
          <DialogDescription>
            {selection?.date && new Date(selection.date + "T00:00:00Z").toLocaleDateString("th-TH", {
              weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>จำนวนชั่วโมง</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              max="24"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>หมายเหตุ (ถ้ามี)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น งานเร่งด่วน หรือเหตุผลในการลา"
            />
          </div>
        </div>
        <DialogFooter className="flex-row gap-2 sm:justify-between">
          {selection?.existing ? (
            <Button variant="outline" size="sm" onClick={onDelete} disabled={pending}>
              <Trash2 className="h-4 w-4" />
              ลบ
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>ยกเลิก</Button>
            <Button
              size="sm"
              onClick={() => {
                const h = parseFloat(hours);
                if (!Number.isFinite(h) || h < 0) {
                  toast.error("ชั่วโมงไม่ถูกต้อง");
                  return;
                }
                onSave(h, notes.trim() || null);
              }}
              disabled={pending}
            >
              บันทึก
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
