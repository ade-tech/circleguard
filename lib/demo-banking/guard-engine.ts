import type { TrendResult } from "@/lib/open-banking/types";

export type GuardRiskLevel = "green" | "amber" | "red";

export function guardRiskLevel(readiness?: TrendResult["readiness"]): GuardRiskLevel {
  return readiness === "ready" ? "green" : readiness === "protection_recommended" ? "amber" : "red";
}

export function guardProtectedCycles(riskLevel: GuardRiskLevel, cycleNumber: number) {
  const requested = riskLevel === "green" ? 0 : riskLevel === "amber" ? 1 : 2;
  return Math.min(requested, Math.max(8 - cycleNumber, 0));
}

export function guardExplanation(riskLevel: GuardRiskLevel, trend?: Pick<TrendResult, "inflowTrend" | "onTimeRate" | "failedContributions">) {
  if (riskLevel === "green") return "Full payout released because the recipient has healthy inflows and reliable contribution behaviour.";
  const signals = [
    trend?.inflowTrend === "reducing" ? "reducing account inflows" : null,
    trend && trend.onTimeRate < 80 ? `a ${trend.onTimeRate}% previous on-time rate` : null,
    trend?.failedContributions ? `${trend.failedContributions} previous failed contribution attempt${trend.failedContributions === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  const reason = signals.length ? signals.join(" and ") : "limited or irregular payment history";
  return riskLevel === "amber"
    ? `One future contribution is reserved because the recipient has ${reason}.`
    : `Two future contributions are reserved because the recipient has ${reason}.`;
}

export function payoutRecipient<T extends { payout_position: number | null }>(members: T[], cycleNumber: number) {
  const payoutPosition = ((cycleNumber - 1) % members.length) + 1;
  return members.find((member) => member.payout_position === payoutPosition) ?? members[payoutPosition - 1];
}

export type GuardReserveSummary = {
  fundedAmount: number;
  claimedAmount: number;
  availableAmount: number;
  fundingRate: number;
  claimCount: number;
};

export type GuardClaim = {
  cycle_id: string;
  beneficiary_id: string;
  amount: number;
  status: "available" | "pending" | "paid" | "rejected";
  reason: string;
};

export function buildGuardClaimLedger(
  contributionAmount: number,
  contributions: Array<{ cycle_id: string; profile_id?: string; outcome: "early" | "on_time" | "late" | "failed" }>,
  guardCredits: Array<{ applied_cycle_id: string; beneficiary_id: string }>,
): GuardClaim[] {
  const failedByCycle = new Map<string, Array<string>>();
  contributions.forEach((contribution) => {
    if (contribution.outcome !== "failed") return;
    const existing = failedByCycle.get(contribution.cycle_id) ?? [];
    existing.push(contribution.profile_id ?? "");
    failedByCycle.set(contribution.cycle_id, existing);
  });

  const claims = new Map<string, GuardClaim>();
  guardCredits.forEach((credit) => {
    if (!failedByCycle.has(credit.applied_cycle_id)) return;
    const key = `${credit.applied_cycle_id}:${credit.beneficiary_id}`;
    claims.set(key, {
      cycle_id: credit.applied_cycle_id,
      beneficiary_id: credit.beneficiary_id,
      amount: contributionAmount,
      status: "available",
      reason: "Failed contribution triggered the reserve support window.",
    });
  });

  return Array.from(claims.values());
}

export function calculateGuardReserve(
  contributionAmount: number,
  contributions: Array<{ cycle_id: string; outcome: "early" | "on_time" | "late" | "failed" }>,
  guardCredits: Array<{ applied_cycle_id: string; beneficiary_id: string }>,
  fundingRate = 0.1,
): GuardReserveSummary {
  const successfulPayments = contributions.filter((contribution) => contribution.outcome !== "failed").length;
  const claimedCycleIds = new Set(
    guardCredits
      .filter((credit) => contributions.some((contribution) => contribution.cycle_id === credit.applied_cycle_id && contribution.outcome === "failed"))
      .map((credit) => credit.applied_cycle_id),
  );
  const fundedAmount = Math.round(successfulPayments * contributionAmount * fundingRate);
  const claimedAmount = Math.min(fundedAmount, claimedCycleIds.size * contributionAmount);
  return {
    fundedAmount,
    claimedAmount,
    availableAmount: Math.max(0, fundedAmount - claimedAmount),
    fundingRate,
    claimCount: claimedCycleIds.size,
  };
}
