export type ConsentResult = {
  consentId: string;
  verificationUrl: string;
  status: "pending" | "approved";
};

export type BankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  maskedNumber: string;
  currency: "NGN";
  availableBalance?: number;
  source: "open_banking_nigeria_sandbox" | "local_mock" | "official_bank_provider";
  isSharedSandboxFixture: boolean;
};

export type BankTransaction = {
  id: string;
  amount: number;
  direction: "credit" | "debit";
  status: "completed" | "failed" | "pending";
  category: "inflow" | "contribution" | "other";
  reference: string;
  occurredAt: string;
  dueAt?: string;
};

export type MandateStatus = "active" | "pending" | "revoked" | "expired" | "failed";

export type TrendResult = {
  inflowTrend: "growing" | "stable" | "reducing" | "insufficient_data";
  monthlyInflows: Array<{ month: string; amount: number }>;
  averageMonthlyInflow: number;
  contributionBurden: number | null;
  balanceCoverage: number | null;
  onTimeRate: number;
  completedContributions: number;
  failedContributions: number;
  mandateStatus: MandateStatus;
  score: number;
  readiness: "ready" | "protection_recommended" | "action_required";
  reasons: string[];
};
