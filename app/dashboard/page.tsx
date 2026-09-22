import Link from "next/link";
import { ArrowRight, CircleDollarSign, Plus, ShieldCheck, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/app-shell";

type Circle = {
  id: string;
  name: string;
  contribution_amount: number;
  frequency: string;
  member_limit: number;
  status: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("circles")
    .select("id,name,contribution_amount,frequency,member_limit,status")
    .order("created_at", { ascending: false });
  const circles = (data ?? []) as Circle[];
  const firstName = user?.user_metadata.full_name?.split(" ")[0] || "there";
  const totalCapacity = circles.reduce((sum, circle) => sum + circle.member_limit, 0);
  const activeCount = circles.filter((circle) => circle.status === "active").length;
  const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
  const today = new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <AppShell>
      <main className="p-5 sm:p-7 xl:p-10">
        <div className="mx-auto max-w-[1120px]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2b7659]">Circle health · {today}</p><h1 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] sm:text-4xl">Good day, {firstName}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#68746f]">A clear view of the circles you are helping keep reliable.</p></div>
            <Link href="/circles/new" className="hidden items-center gap-2 rounded-xl bg-[#123f31] px-4 py-3 text-sm font-semibold text-white sm:flex"><Plus size={17} /> Create a circle</Link>
          </div>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <Metric label="Circles watched" value={String(circles.length)} note={`${activeCount} active now`} icon={<CircleDollarSign size={19} />} />
            <Metric label="Members covered" value={String(totalCapacity)} note="Total circle capacity" icon={<Users size={19} />} />
            <Metric label="Still forming" value={String(circles.filter((circle) => circle.status === "forming").length)} note="Waiting for members" icon={<ShieldCheck size={19} />} />
          </section>

          <section className="mt-5 overflow-hidden rounded-2xl border border-[#cfe2d8] bg-[#f1f8f4]">
            <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-start sm:px-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#dcefe5] text-[#247352]"><ShieldCheck size={21} /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2b7659]">A private trust layer</p>
                <h2 className="mt-1 text-lg font-semibold text-[#19352b]">Financial context stays private. Reliability stays visible.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b7067]">CircleGuard checks connected balances, inflows, and payment patterns to help a group protect its next contribution without exposing personal banking details.</p>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-xl border border-[#d7e9df] bg-white/75 px-4 py-3"><p className="font-semibold text-[#244638]">You control your data</p><p className="mt-1 leading-5 text-[#687b73]">Your banking information is used to calculate your private readiness result.</p></div>
                  <div className="rounded-xl border border-[#d7e9df] bg-white/75 px-4 py-3"><p className="font-semibold text-[#244638]">Groups see results, not details</p><p className="mt-1 leading-5 text-[#687b73]">Circle members see readiness signals and Guard status, never your raw balance or transactions.</p></div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-5 overflow-hidden rounded-2xl border border-[#e1e5e2] bg-white">
            <div className="flex items-center justify-between border-b border-[#e7eae8] px-5 py-4 sm:px-6"><div><h2 className="font-semibold">Your circles</h2><p className="mt-1 text-sm text-[#78847f]">Recently created or joined</p></div>{circles.length > 0 && <Link href="/circles" className="flex items-center gap-2 text-sm font-semibold text-[#2b7659]">View all <ArrowRight size={15} /></Link>}</div>
            {circles.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-14 text-center"><span className="grid size-12 place-items-center rounded-full bg-[#edf4f0] text-[#2b7659]"><CircleDollarSign size={22} /></span><h3 className="mt-4 font-semibold">No circles yet</h3><p className="mt-2 max-w-sm text-sm text-[#78847f]">Create your first savings circle or join one through a private invitation.</p><Link href="/circles/new" className="mt-5 flex items-center gap-2 rounded-xl bg-[#123f31] px-5 py-3 text-sm font-semibold text-white"><Plus size={16} /> Create a circle</Link></div>
            ) : (
              <div className="divide-y divide-[#edf0ee]">{circles.slice(0, 4).map((circle) => <Link key={circle.id} href={`/circles/${circle.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#fafbfa] sm:px-6"><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate font-semibold">{circle.name}</h3><span className="rounded-full bg-[#f0f5f2] px-2 py-0.5 text-[10px] font-semibold capitalize text-[#367158]">{circle.status}</span></div><p className="mt-1 text-sm capitalize text-[#7b8782]">{money.format(circle.contribution_amount)} {circle.frequency} · Up to {circle.member_limit} members</p></div><ArrowRight size={17} className="shrink-0 text-[#8e9994]" /></Link>)}</div>
            )}
          </section>

          <section className="mt-5 overflow-hidden rounded-2xl border border-[#e1e5e2] bg-white"><div className="border-b border-[#e7eae8] px-5 py-4 sm:px-6"><h2 className="font-semibold">Circle activity</h2><p className="mt-1 text-sm text-[#78847f]">Contribution and Guard events will appear here as circles progress.</p></div><div className="flex items-center gap-3 px-5 py-10 text-sm text-[#89948f] sm:px-6"><span className="size-2 rounded-full bg-[#c5d8cc]" /> No contribution events recorded yet.</div></section>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#dfe6e2] bg-[#f4f8f6] px-5 py-4 text-sm text-[#52615b]"><ShieldCheck size={20} className="shrink-0 text-[#277a5b]" /><p><b className="text-[#244638]">Open Banking sandbox:</b> Financial actions will be simulated. No real funds are moved.</p></div>
        </div>
      </main>
    </AppShell>
  );
}

function Metric({ label, value, note, icon }: { label: string; value: string; note: string; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-[#e1e5e2] bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm text-[#74807b]">{label}</p><span className="grid size-9 place-items-center rounded-xl bg-[#eff3f1] text-[#315c4d]">{icon}</span></div><p className="mt-4 text-2xl font-semibold tracking-[-0.02em]">{value}</p><p className="mt-2 text-xs text-[#8b9691]">{note}</p></div>;
}
