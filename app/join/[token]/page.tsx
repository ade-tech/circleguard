import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Check, ShieldCheck, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { acceptInvitation } from "./actions";
import { JoinApprovalWatcher } from "@/components/join-approval-watcher";
import { checkJoinEligibility } from "@/lib/demo-banking/join-eligibility";
import { PendingButton } from "@/components/pending-button";
import { OpenBankingNigeriaSandboxAdapter } from "@/lib/open-banking/sandbox-adapter";

type Invite = { circle_id: string; circle_name: string; contribution_amount: number; frequency: string; member_limit: number; start_date: string; proposed_payout_position: number | null; expires_at: string; status: string };

export default async function JoinPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string; requested?: string }> }) {
  const { token } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/join/${token}`);
  const connection = user.user_metadata.sandbox_bank_connection as { bvn?: string } | undefined;
  if (!connection?.bvn) redirect(`/bank?next=/join/${token}`);
  const { data, error } = await supabase.rpc("get_invitation_by_token", { p_token: token });
  const invite = (Array.isArray(data) ? data[0] : data) as Invite | undefined;
  if (error || !invite) return <InvalidInvite />;
  const { data: activeMembership } = await supabase.from("circle_members").select("id").eq("circle_id", invite.circle_id).eq("profile_id", user.id).eq("status", "active").maybeSingle();
  if (activeMembership) {
    await supabase.from("demo_bank_connections").upsert({
      circle_id: invite.circle_id,
      user_id: user.id,
      profile_key: user.user_metadata.demo_bank_profile_key,
    }, { onConflict: "circle_id,user_id" });
    redirect(`/circles/${invite.circle_id}`);
  }
  const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
  const payout = Number(invite.contribution_amount) * invite.member_limit;
  const openBanking = new OpenBankingNigeriaSandboxAdapter();
  const snapshot = await openBanking.getAccountsForBvn(connection.bvn, user.user_metadata.full_name || "Circle member");
  const transactions = openBanking.getTransactionsForBvn(connection.bvn, snapshot.accounts);
  const eligibility = checkJoinEligibility(snapshot.accounts, transactions, Number(invite.contribution_amount));

  return <main className="min-h-screen bg-[#f4f5f3] px-5 py-12 text-[#17211d]"><div className="mx-auto max-w-2xl"><div className="flex justify-center"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-[#123f31] font-bold text-white">CG</span><div><p className="font-bold">CircleGuard</p><p className="text-xs text-[#7a8580]">Private circle invitation</p></div></div></div>
    <section className="mt-8 overflow-hidden rounded-3xl border border-[#e1e5e2] bg-white shadow-[0_20px_60px_rgba(20,48,37,0.08)]"><div className="border-b border-[#e7eae8] p-7 text-center"><p className="text-sm font-semibold text-[#2b7659]">YOU’RE INVITED TO JOIN</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{invite.circle_name}</h1><p className="mt-2 text-sm text-[#71807a]">Review the terms before joining this savings circle.</p></div>
      <div className="grid gap-4 p-6 sm:grid-cols-2"><Detail icon={<Users size={18} />} label="Members" value={`${invite.member_limit} people`} /><Detail icon={<CalendarDays size={18} />} label="Frequency" value={invite.frequency} /><Detail icon={<Check size={18} />} label="Your contribution" value={money.format(invite.contribution_amount)} /><Detail icon={<ShieldCheck size={18} />} label="Payout each cycle" value={money.format(payout)} /></div>
      {query.requested === "1" ? <div className="mx-6 rounded-2xl border border-[#cfe2d8] bg-[#f0f7f3] p-5 text-center"><span className="mx-auto grid size-10 place-items-center rounded-full bg-[#2b7659] text-white"><Check size={19} /></span><h2 className="mt-3 font-semibold text-[#244638]">Request sent</h2><p className="mt-2 text-sm text-[#607169]">This page will open the circle automatically after approval.</p><JoinApprovalWatcher /></div> : <div className={`mx-6 rounded-2xl border p-5 text-sm leading-6 ${eligibility.status === "not_eligible" ? "border-red-200 bg-red-50 text-red-700" : "border-[#dce6e1] bg-[#f4f8f6] text-[#52635b]"}`}><b className={eligibility.status === "not_eligible" ? "text-red-800" : "text-[#244638]"}>{eligibility.label}</b><p className="mt-1">{eligibility.message}</p><p className="mt-2 text-xs opacity-75">Only this result is shared. Your balance and transactions remain private.</p></div>}
      {query.error && <p className="mx-6 mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{query.error === "not_eligible" ? "Your private affordability check did not pass for this contribution amount." : "We could not accept this invitation. It may already be used."}</p>}
      {query.requested !== "1" && <form action={acceptInvitation} className="p-6"><input type="hidden" name="token" value={token} /><PendingButton disabled={eligibility.status === "not_eligible"} pendingLabel="Checking and sending…" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#123f31] px-5 py-3.5 font-semibold text-white">{eligibility.status === "not_eligible" ? "Not eligible to request" : "Request to join circle"}</PendingButton></form>}
    </section></div></main>;
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex gap-3 rounded-xl border border-[#e6e9e7] p-4"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#eef3f0] text-[#2b7659]">{icon}</span><div><p className="text-xs text-[#7d8984]">{label}</p><p className="mt-1 font-semibold capitalize">{value}</p></div></div>; }
function InvalidInvite() { return <main className="grid min-h-screen place-items-center bg-[#f4f5f3] p-5 text-center"><div><h1 className="text-2xl font-semibold">Invitation unavailable</h1><p className="mt-2 text-[#6f7b76]">This link is invalid, expired, or already used.</p><Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-[#123f31] px-5 py-3 text-sm font-semibold text-white">Go to home</Link></div></main>; }
