"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Plane,
  Plus,
  Send,
  Timer,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { saveSupervisorAssignment } from "@/app/liff/my-attendance/schedule/actions";
import type { ScheduleEntry, ScheduleEntryType } from "@/lib/types";

const TYPES: { key: ScheduleEntryType; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "work",     label: "ทำงาน", icon: <Briefcase className="h-3.5 w-3.5" />, color: "bg-navy-50 text-navy-800 border-navy-200" },
  { key: "overtime", label: "OT",    icon: <Timer className="h-3.5 w-3.5" />,    color: "bg-orange-50 text-orange-800 border-orange-200" },
  { key: "leave",    label: "ลา",    icon: <Plane className="h-3.5 w-3.5" />,    color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
];

const DAY_LABELS_SHORT = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

interface TeamMember {
  id: string;
  code: string | null;
  name: string;
  department: string | null;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function fmtDateShort(d: string): string {
  const dt = new Date(d + "T00:00:00Z");
  return `${dt.getUTCDate()}/${(dt.getUTCMonth() + 1).toString().padStart(2, "0")}`;
}

interface CellInspect {
  date: string;
  entryType: ScheduleEntryType;
  members: { member: TeamMember; entry: ScheduleEntry }[];
}

interface CreateState {
  date: string;
  entryType: ScheduleEntryType;
}

export function SupervisorSchedule({
  supervisor,
  weekStart,
  team,
  entries,
}: {
  supervisor: { id: string; name: string };
  weekStart: string;
  team: TeamMember[];
  entries: ScheduleEntry[];
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [inspect, setInspect] = useState<CellInspect | null>(null);
  const [createOpen, setCreateOpen] = useState<CreateState | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Index entries: date|type → entries
  const byCell = useMemo(() => {
    const m = new Map<string, { member: TeamMember; entry: ScheduleEntry }[]>();
    const memberById = new Map(team.map((t) => [t.id, t]));
    for (const e of entries) {
      const member = memberById.get(e.employee_id);
      if (!member) continue;
      const key = `${e.date}|${e.entry_type}`;
      const list = m.get(key) ?? [];
      list.push({ member, entry: e });
      m.set(key, list);
    }
    return m;
  }, [entries, team]);

  function navigateWeek(delta: number) {
    const next = addDays(weekStart, delta * 7);
    const params = new URLSearchParams(search.toString());
    params.set("week", next);
    router.push(`/liff/my-attendance/schedule?${params.toString()}`);
  }

  function openCell(date: string, type: ScheduleEntryType) {
    const list = byCell.get(`${date}|${type}`) ?? [];
    if (list.length === 0) {
      setCreateOpen({ date, entryType: type });
    } else {
      setInspect({ date, entryType: type, members: list });
    }
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-navy-500">มุมมองหัวหน้า</div>
              <div className="mt-0.5 text-sm font-semibold text-navy-900">
                {supervisor.name} · ทีม {team.length} คน
              </div>
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
              <Row key={row.key} label={row.label} icon={row.icon}>
                {days.map((d) => {
                  const list = byCell.get(`${d}|${row.key}`) ?? [];
                  return (
                    <SupervisorCell
                      key={`${d}-${row.key}`}
                      list={list}
                      colorClass={row.color}
                      onClick={() => openCell(d, row.key)}
                    />
                  );
                })}
              </Row>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 text-[11px] text-navy-500">
          แตะกล่องว่างเพื่อสร้างกล่องใหม่ + เลือกพนักงาน · แตะกล่องที่มีคนเพื่อดูรายชื่อ
        </CardContent>
      </Card>

      {/* Inspect / member list dialog */}
      <Dialog open={!!inspect} onOpenChange={(o) => { if (!o) setInspect(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {inspect && (inspect.entryType === "work" ? "ทำงานปกติ" : inspect.entryType === "overtime" ? "ทำโอที" : "ลา")}
            </DialogTitle>
            <DialogDescription>
              {inspect?.date && new Date(inspect.date + "T00:00:00Z").toLocaleDateString("th-TH", {
                weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {inspect?.members.map(({ member, entry }) => (
              <div key={member.id} className="flex items-center justify-between rounded-md border border-navy-100 p-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-navy-900">{member.name}</div>
                  <div className="text-[10px] text-navy-500">
                    {member.code ?? member.id.slice(0, 6)} · {member.department ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {entry.is_supervisor_override && <Badge variant="warning">override</Badge>}
                  <span className="text-sm font-bold tabular-nums text-navy-900">{entry.hours}</span>
                  <span className="text-[10px] text-navy-500">ชม.</span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (inspect) setCreateOpen({ date: inspect.date, entryType: inspect.entryType });
                setInspect(null);
              }}
            >
              <Plus className="h-4 w-4" />
              เพิ่มอีก
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setInspect(null)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create assignment dialog */}
      <CreateAssignmentDialog
        state={createOpen}
        team={team}
        onClose={() => setCreateOpen(null)}
        onSave={(input) => {
          startTransition(async () => {
            const res = await saveSupervisorAssignment({
              supervisorId: supervisor.id,
              ...input,
            });
            if (!res.ok) {
              toast.error(res.message ?? "บันทึกไม่สำเร็จ");
              return;
            }
            toast.success(res.message ?? "บันทึกแล้ว");
            setCreateOpen(null);
            router.refresh();
          });
        }}
        pending={pending}
      />
    </>
  );
}

function Row({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
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

function SupervisorCell({
  list,
  colorClass,
  onClick,
}: {
  list: { member: TeamMember; entry: ScheduleEntry }[];
  colorClass: string;
  onClick: () => void;
}) {
  const filled = list.length > 0;
  const total = list.reduce((acc, x) => acc + x.entry.hours, 0);
  const avg = filled ? Math.round(total / list.length) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex aspect-square min-h-[44px] flex-col items-center justify-center rounded-md border transition-colors",
        filled ? colorClass : "border-dashed border-navy-200 bg-white text-navy-400 hover:border-orange-300",
      )}
    >
      {filled ? (
        <>
          <div className="flex items-center gap-0.5 text-[9px] font-semibold">
            <Users className="h-2.5 w-2.5" /> {list.length}
          </div>
          <div className="text-[10px] tabular-nums">~{avg}h</div>
        </>
      ) : (
        <Plus className="h-4 w-4" />
      )}
    </button>
  );
}

function CreateAssignmentDialog({
  state,
  team,
  onClose,
  onSave,
  pending,
}: {
  state: CreateState | null;
  team: TeamMember[];
  onClose: () => void;
  onSave: (input: {
    date: string;
    entryType: ScheduleEntryType;
    hours: number;
    notes: string | null;
    employeeIds: string[];
  }) => void;
  pending: boolean;
}) {
  const [hours, setHours] = useState("");
  const [type, setType] = useState<ScheduleEntryType>("work");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  return (
    <Dialog
      open={!!state}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
        } else if (state) {
          setType(state.entryType);
          setHours(state.entryType === "work" ? "8" : state.entryType === "overtime" ? "3" : "8");
          setNotes("");
          setSelected(new Set());
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>สร้างกล่องตารางงาน</DialogTitle>
          <DialogDescription>
            {state?.date && new Date(state.date + "T00:00:00Z").toLocaleDateString("th-TH", {
              weekday: "long", day: "numeric", month: "short", timeZone: "UTC",
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>ประเภท</Label>
              <Select value={type} onValueChange={(v) => setType(v as ScheduleEntryType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">ทำงานปกติ</SelectItem>
                  <SelectItem value="overtime">โอที</SelectItem>
                  <SelectItem value="leave">ลา</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ชั่วโมง</Label>
              <Input type="number" step="0.5" min="0" max="24" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>หมายเหตุ (ถ้ามี)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>เลือกพนักงาน ({selected.size}/{team.length})</Label>
            <div className="max-h-[180px] space-y-1 overflow-y-auto rounded-md border border-navy-100 p-2">
              <button
                type="button"
                onClick={() => {
                  if (selected.size === team.length) setSelected(new Set());
                  else setSelected(new Set(team.map((m) => m.id)));
                }}
                className="w-full rounded px-2 py-1 text-left text-[11px] font-medium text-orange-600 hover:bg-orange-50"
              >
                {selected.size === team.length ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
              </button>
              {team.map((m) => {
                const checked = selected.has(m.id);
                return (
                  <label
                    key={m.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5",
                      checked ? "bg-orange-50" : "hover:bg-navy-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const s = new Set(selected);
                        if (e.target.checked) s.add(m.id);
                        else s.delete(m.id);
                        setSelected(s);
                      }}
                      className="h-4 w-4 accent-orange-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-navy-900">{m.name}</div>
                      <div className="text-[10px] text-navy-500">{m.code ?? "—"} · {m.department ?? "—"}</div>
                    </div>
                  </label>
                );
              })}
              {team.length === 0 && (
                <div className="px-2 py-3 text-center text-xs text-navy-400">ยังไม่มีพนักงานในทีม</div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>ยกเลิก</Button>
          <Button
            size="sm"
            disabled={pending || selected.size === 0}
            onClick={() => {
              if (!state) return;
              const h = parseFloat(hours);
              if (!Number.isFinite(h) || h <= 0) {
                toast.error("ชั่วโมงไม่ถูกต้อง");
                return;
              }
              onSave({
                date: state.date,
                entryType: type,
                hours: h,
                notes: notes.trim() || null,
                employeeIds: Array.from(selected),
              });
            }}
          >
            <Send className="h-4 w-4" />
            บันทึก & แจ้งพนักงาน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
