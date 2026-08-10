import type { Metadata } from "next";
import "./styles.css";
import "./flow.css";
import "./c1.css";
import "./c2.css";
import "./c3.css";
import "./c4.css";
import "./alpha.css";
import "./diagnostics.css";
import "./feedback.css";
import "./shell.css";
import "./accessibility.css";
import "./visual-v1.css";
import "./learn/lesson-v1.css";
import "./labs-v1.css";
import "./visual-v1-create-journey.css";
import "./visual-v1-progress.css";
import "./visual-v1-audit.css";
import "./visual-v1-1-recovery.css";
import "./visual-v1-1-layout-system.css";
import { AppShell } from "./app-shell";

export const metadata: Metadata = {
  title: "SimpleWay Drawing",
  description: "Learn, practice, create and evolve through the SimpleWay Drawing method.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
