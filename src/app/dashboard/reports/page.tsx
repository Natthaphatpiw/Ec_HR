import { redirect } from "next/navigation";

/** Keep legacy bookmarks working while the source-backed report lives at the analytics route. */
export default function ReportsPage() {
  redirect("/dashboard/analytics");
}
