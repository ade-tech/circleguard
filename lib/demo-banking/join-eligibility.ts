import { analyzeAccountTrend } from "@/lib/open-banking/trend-engine";
import type { BankAccount, BankTransaction } from "@/lib/open-banking/types";

export type JoinEligibility = {
  status: "eligible" | "needs_protection" | "not_eligible";
  label: string;
  message: string;
  totalBalance: number;
  averageMonthlyInflow: number;
  balanceCoverage: number | null;
  historyMonths: number;
};

export function checkJoinEligibility(accounts: BankAccount[], transactions: BankTransaction[], contributionAmount: number): JoinEligibility {
  const totalBalance = accounts.reduce((total, account) => total + (account.availableBalance ?? 0), 0);
  const historyMonths = new Set(transactions.filter((transaction) => transaction.direction === "credit").map((transaction) => transaction.occurredAt.slice(0, 7))).size;
  if (!accounts.length || !Number.isFinite(contributionAmount) || contributionAmount <= 0) {
    return { status: "not_eligible", label: "Check unavailable", message: "Verify your BVN and connect your bank accounts before joining.", totalBalance, averageMonthlyInflow: 0, balanceCoverage: null, historyMonths };
  }

  const trend = analyzeAccountTrend(
    transactions,
    "active",
    { contributionAmount, availableBalance: totalBalance },
  );
  const remainingBalance = totalBalance - contributionAmount;
  const burden = trend.contributionBurden ?? 1;
  const summary = { totalBalance, averageMonthlyInflow: trend.averageMonthlyInflow, balanceCoverage: trend.balanceCoverage, historyMonths };

  if (totalBalance < contributionAmount || remainingBalance < contributionAmount || historyMonths < 3 || trend.averageMonthlyInflow < contributionAmount * 2 || burden > 0.5 || trend.inflowTrend === "reducing") {
    return {
      status: "not_eligible",
      label: "Not eligible for this circle",
      message: totalBalance < contributionAmount ? "Your combined verified balance cannot cover the first contribution." : historyMonths < 3 ? "There is not enough transaction history to confirm consistent income." : "Your combined balance or income pattern cannot reliably support this contribution.",
      ...summary,
    };
  }

  if (burden > 0.35 || trend.inflowTrend === "insufficient_data" || trend.averageMonthlyInflow < contributionAmount * 3) {
    return {
      status: "needs_protection",
      label: "Eligible with Guard protection",
      message: "Your balance can cover the contribution, but your income buffer is moderate. CircleGuard will monitor payment readiness.",
      ...summary,
    };
  }

  return {
    status: "eligible",
    label: "Eligible to join",
    message: "Your combined balance and recent inflow history can cover this contribution while retaining a buffer.",
    ...summary,
  };
}
