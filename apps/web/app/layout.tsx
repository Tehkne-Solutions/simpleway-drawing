import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "SimpleWay Drawing",
  description: "Learn, practice, create and evolve through the SimpleWay Drawing method.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
