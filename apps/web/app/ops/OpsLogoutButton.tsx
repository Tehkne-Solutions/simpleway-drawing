"use client";

import { useRouter } from "next/navigation";

export function OpsLogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/ops/session", { method: "DELETE" });
    router.replace("/ops/login");
    router.refresh();
  }
  return <button className="secondary" type="button" onClick={logout}>Sair</button>;
}
