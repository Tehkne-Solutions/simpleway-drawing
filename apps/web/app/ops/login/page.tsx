import { redirect } from "next/navigation";
import { hasOpsSession } from "../../../server/ops-session";
import { OpsLoginForm } from "./OpsLoginForm";

export const dynamic = "force-dynamic";

export default async function OpsLoginPage() {
  if (await hasOpsSession()) redirect("/ops");
  return <main className="flow-shell"><OpsLoginForm /></main>;
}
