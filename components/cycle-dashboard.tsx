import { AlertTriangle, CheckCircle2, Clock3, ShieldCheck, TrendingUp } from "lucide-react";
import { CycleSimulator } from "@/components/cycle-simulator";
import { GuardOverridePanel } from "@/components/guard-override-panel";

type Cycle = { id: string; cycle_number: number; due_date: string };
type Assessment = {
  cycle_id: string;
  profile_id: string;
  score: number;
  readiness: "ready" | "protection_recommended" | "action_required";
  inflow_trend: string;
  on_time_rate: number;
  reasons: string[];
};
type Contribution = {
  cycle_id: string;
  profile_id: string;
  outcome: "early" | "on_time" | "late" | "failed";
};
type GuardCredit = { applied_cycle_id: string; beneficiary_id: string };
type GuardPlan = {
  cycle_id: string;
  beneficiary_id: string;
  risk_level: "green" | "amber" | "red";
  protected_cycles: number;
  gross_payout: number;
  reserve_amount: number;
  net_payout: number;
  status: "released" | "awaiting_contributions";
  explanation: string;
};
type GuardReserve = { fundedAmount: number; claimedAmount: number; availableAmount: number; fundingRate: number; claimCount: number };
type GuardClaim = { cycle_id: string; beneficiary_id: string; amount: number; status: "available" | "pending" | "paid" | "rejected"; reason: string };

export function CycleDashboard({
  circleId,
  isAdmin,
  memberCount,
  currentUserId,
  cycles,
  assessments,
  contributions,
  guardPlans,
  guardCredits,
  guardReserve,
  guardClaims,
  memberNames,
}: {
  circleId: string;
  isAdmin: boolean;
  memberCount: number;
  currentUserId: string;
  cycles: Cycle[];
  assessments: Assessment[];
  contributions: Contribution[];
  guardPlans: GuardPlan[];
  guardCredits: GuardCredit[];
  guardReserve: GuardReserve;
  guardClaims: GuardClaim[];
  memberNames: Record<string, string>;
}) {
  const latestCycle = cycles[0];
  const latestAssessments = latestCycle
    ? assessments.filter((item) => item.cycle_id === latestCycle.id)
    : [];
  const guardPlan = latestCycle ? guardPlans.find((plan) => plan.cycle_id === latestCycle.id) : undefined;
  const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
  const reserveCoverage = guardReserve.fundedAmount > 0
    ? Math.round((guardReserve.availableAmount / guardReserve.fundedAmount) * 100)
    : 0;

  return <section className="mt-5 overflow-hidden rounded-2xl border border-[#e1e5e2] bg-white">
    <div className="flex flex-col justify-between gap-4 border-b border-[#e7eae8] px-6 py-5 sm:flex-row sm:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2b7659]">Cycle intelligence</p>
        <h2 className="mt-1 font-semibold">Circle protection desk</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#78847f]">Readiness signals help the group decide where a contribution needs a little more protection.</p>
      </div>
      {isAdmin && <CycleSimulator circleId={circleId} />}
    </div>

    {!latestCycle ? <div className="px-6 py-10 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-full bg-[#edf4f0] text-[#2b7659]"><TrendingUp size={20} /></span>
      <h3 className="mt-3 font-semibold">No cycle simulated yet</h3>
      <p className="mt-1 text-sm text-[#78847f]">The first cycle establishes payment history. Later predictions will change as new behaviour is revealed.</p>
    </div> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#fafbfa] px-6 py-3 text-sm">
        <span className="font-semibold">Latest result · Cycle {latestCycle.cycle_number}</span>
        <span className="text-[#78847f]">Due {formatDate(latestCycle.due_date)}</span>
      </div>
      <div className="mx-5 mb-5 overflow-hidden rounded-xl border border-[#cbded2] bg-[#f1f8f4]">
        <div className="flex flex-col justify-between gap-3 border-b border-[#d8e9df] px-5 py-4 sm:flex-row sm:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#2b7659]">Guard reserve</p><h3 className="mt-1 text-lg font-semibold text-[#19352b]">The circle has a protection buffer</h3><p className="mt-1 text-sm text-[#697871]">{Math.round(guardReserve.fundingRate * 100)}% of successful sandbox contributions funds eligible claims.</p></div><span className="rounded-full bg-[#dcefe5] px-3 py-1.5 text-xs font-semibold text-[#247352]">{guardReserve.claimCount} claim{guardReserve.claimCount === 1 ? "" : "s"}</span></div>
        <div className="grid gap-3 px-5 py-4 sm:grid-cols-3"><GuardAmount label="Funded" value={money.format(guardReserve.fundedAmount)} /><GuardAmount label="Claims paid" value={money.format(guardReserve.claimedAmount)} /><GuardAmount label="Available now" value={money.format(guardReserve.availableAmount)} strong /></div>
        <div className="border-t border-[#d8e9df] px-5 py-4"><div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#597067]"><span>Reserve available</span><span>{reserveCoverage}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#d8e9df]"><div className="h-full rounded-full bg-[#2d765b] transition-all" style={{ width: `${Math.min(100, Math.max(0, reserveCoverage))}%` }} /></div><div className="mt-4 grid gap-3 text-xs text-[#60736a] sm:grid-cols-3"><FlowStep number="01" label="Members contribute" /><FlowStep number="02" label="Guard keeps a buffer" /><FlowStep number="03" label="Claims cover a miss" /></div></div>
      </div>
      <div className="mx-5 mb-5 rounded-2xl border border-[#dce8e1] bg-white p-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#68766f]">Reserve ledger</p><h3 className="mt-1 font-semibold">Active protection claims</h3></div><span className="text-xs font-semibold text-[#5c6a64]">{guardClaims.length} item{guardClaims.length === 1 ? "" : "s"}</span></div>
        {guardClaims.length > 0 ? <div className="mt-4 space-y-3">{guardClaims.map((claim) => <div key={`${claim.cycle_id}-${claim.beneficiary_id}`} className="flex flex-col justify-between gap-3 rounded-xl border border-[#e5ece8] bg-[#f7faf8] px-4 py-3 sm:flex-row sm:items-center"><div><p className="font-semibold text-[#123f31]">{memberNames[claim.beneficiary_id] ?? "Protected member"}</p><p className="mt-1 text-xs text-[#717f79]">Cycle {latestCycle.cycle_number} reserve claim · {claim.reason}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-[#edf5f0] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2c7759]">{claim.status}</span><span className="text-sm font-semibold text-[#123f31]">{money.format(claim.amount)}</span></div></div>)}</div> : <p className="mt-4 text-sm text-[#73807b]">No active reserve claims yet. The protection pool only grows when a contribution fails.</p>}
      </div>
      {guardPlan && <div className={`m-5 mt-0 overflow-hidden rounded-2xl border ${guardPlan.risk_level === "green" ? "border-emerald-200 bg-emerald-50/60" : guardPlan.risk_level === "amber" ? "border-amber-200 bg-amber-50/60" : "border-red-200 bg-red-50/60"}`}>
        <div className="flex flex-col justify-between gap-3 border-b border-black/5 px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-white text-[#235f49]"><ShieldCheck size={20} /></span><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#68766f]">{guardPlan.risk_level} Guard</p><h3 className="font-semibold">Payout for {memberNames[guardPlan.beneficiary_id] ?? "scheduled recipient"}</h3></div></div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold capitalize">{guardPlan.status.replaceAll("_", " ")}</span>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3"><GuardAmount label="Gross payout" value={money.format(guardPlan.gross_payout)} /><GuardAmount label="Guard reserve" value={money.format(guardPlan.reserve_amount)} /><GuardAmount label="Released to member" value={money.format(guardPlan.net_payout)} strong /></div>
        <div className="px-5 pb-5"><p className="text-sm leading-6 text-[#596760]">{guardPlan.explanation}</p>{guardPlan.protected_cycles > 0 && <p className="mt-2 text-xs font-semibold text-[#365c4c]">{guardPlan.status === "released" ? `Next ${guardPlan.protected_cycles} contribution${guardPlan.protected_cycles === 1 ? "" : "s"} automatically covered by the reserve.` : "The reserve activates automatically once all current contributions are complete."}</p>}</div>
        <GuardOverridePanel circleId={circleId} cycleNumber={latestCycle.cycle_number} riskLevel={guardPlan.risk_level} fullPayout={money.format(guardPlan.gross_payout)} initialOverride={null} initialViewerIsBeneficiary={guardPlan.beneficiary_id === currentUserId} />
      </div>}
      <div className="divide-y divide-[#edf0ee]">
        {latestAssessments.map((assessment) => {
          const contribution = contributions.find((item) => item.cycle_id === latestCycle.id && item.profile_id === assessment.profile_id);
          const coveredByGuard = guardCredits.some((credit) => credit.applied_cycle_id === latestCycle.id && credit.beneficiary_id === assessment.profile_id);
          const display = readinessDisplay(assessment.readiness);
          return <div key={assessment.profile_id} className="grid gap-3 px-6 py-4 sm:grid-cols-[1.3fr_1fr_1fr] sm:items-center">
            <div>
              <p className="font-semibold">{memberNames[assessment.profile_id] ?? "Circle member"}</p>
              <p className="mt-1 text-xs capitalize text-[#78847f]">Inflows: {assessment.inflow_trend.replaceAll("_", " ")} · {latestCycle.cycle_number === 1 ? "No previous circle payments" : `Previous on-time rate: ${assessment.on_time_rate}%`}</p>
              <p className="mt-1 text-xs text-[#78847f]">{assessment.reasons.filter((reason) => reason.startsWith("Affordability is") || reason.startsWith("Cash buffer is")).join(" · ")}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`grid size-8 place-items-center rounded-full ${display.className}`}>{display.icon}</span>
              <div><p className="text-xs text-[#7b8781]">Prediction</p><p className="text-sm font-semibold">{display.label} · {assessment.score}/100</p></div>
            </div>
            <div className="sm:text-right"><p className="text-xs text-[#7b8781]">Actual payment</p><p className={`mt-1 text-sm font-semibold capitalize ${contribution?.outcome === "failed" ? "text-red-600" : "text-[#235f49]"}`}>{coveredByGuard ? "Covered by Guard" : contribution ? contribution.outcome.replaceAll("_", " ") : "Not recorded"}</p></div>
          </div>;
        })}
      </div>
      <div className="flex flex-wrap justify-between gap-2 border-t border-[#edf0ee] px-6 py-3 text-xs text-[#7b8781]"><span>Cycle {cycles.length} of 8 simulated</span><span>{latestAssessments.length} of {memberCount} members assessed this cycle</span></div>
    </>}
  </section>;
}

function GuardAmount({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div><p className="text-xs text-[#718078]">{label}</p><p className={`mt-1 ${strong ? "text-xl" : "text-lg"} font-semibold`}>{value}</p></div>;
}

function FlowStep({ number, label }: { number: string; label: string }) {
  return <div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-white text-[10px] font-bold text-[#2b7659]">{number}</span><span>{label}</span></div>;
}

function readinessDisplay(readiness: Assessment["readiness"]) {
  if (readiness === "ready") return { label: "Ready", className: "bg-emerald-50 text-emerald-700", icon: <CheckCircle2 size={16} /> };
  if (readiness === "protection_recommended") return { label: "At risk", className: "bg-amber-50 text-amber-700", icon: <Clock3 size={16} /> };
  return { label: "Likely to default", className: "bg-red-50 text-red-700", icon: <AlertTriangle size={16} /> };
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}
