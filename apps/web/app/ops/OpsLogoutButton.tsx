"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function OpsLogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/ops/session", { method: "DELETE" });
    router.replace("/ops/login");
    router.refresh();
  }
  return <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Link className="secondary" href="/ops/incidents">Incidentes</Link><button className="secondary" type="button" onClick={logout}>Sair</button></div>;
}
