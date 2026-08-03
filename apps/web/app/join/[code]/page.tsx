import { JoinInvite } from "./JoinInvite";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <main className="flow-shell"><JoinInvite code={code} /></main>;
}
