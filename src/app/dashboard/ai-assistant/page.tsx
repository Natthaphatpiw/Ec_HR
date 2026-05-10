import { Sparkles } from "lucide-react";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { AiChat } from "@/components/dashboard/ai-chat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AiAssistantPage() {
  return (
    <>
      <DashboardTopbar
        title="ForgeHR Assistant"
        subtitle="Mastra AI agent · Claude Sonnet 4.6 · Reads live HR data"
      />
      <main className="flex-1 px-6 py-6">
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Card className="h-[calc(100vh-160px)] overflow-hidden">
              <CardHeader className="border-b border-navy-100 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-400 text-white">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">ForgeHR Assistant</CardTitle>
                      <CardDescription className="text-xs">
                        Org: ThaiAuto Factory · Channel: dashboard
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="success">Connected</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <AiChat channel="dashboard" />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Available tools</CardTitle>
                <CardDescription>
                  The agent calls these Supabase-backed tools to answer questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Tool name="get_employee" desc="Look up an employee by code or LINE ID" />
                <Tool name="list_attendance" desc="Read attendance logs by date or employee" />
                <Tool name="get_leave_balance" desc="Annual / sick / personal balances" />
                <Tool name="list_pending_approvals" desc="Pending leave + OT requests" />
                <Tool name="get_payroll_summary" desc="Monthly run, deductions, net pay" />
                <Tool name="suggest_shift_schedule" desc="Mastra-generated shift suggestions" />
                <Tool name="predict_absenteeism" desc="Risk score for next-day no-shows" />
                <Tool name="draft_announcement" desc="Compose a LINE broadcast message" />
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50/30">
              <CardHeader>
                <CardTitle className="text-orange-700">Sales-demo prompts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-navy-700">
                <p>· "Show me attendance for the last 7 days as a chart description"</p>
                <p>· "Run May payroll and tell me total net paid"</p>
                <p>· "Which 3 workers should get the next raise based on KPI?"</p>
                <p>· "Draft a Songkran message for all workers in Thai"</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}

function Tool({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-navy-100 bg-navy-50/40 p-3">
      <code className="rounded bg-navy-900 px-1.5 py-0.5 font-mono text-[10px] text-orange-300">
        {name}
      </code>
      <span className="text-xs text-navy-600">{desc}</span>
    </div>
  );
}
