import type { OpenBankingAdapter } from "./adapter";
import type { BankAccount, BankTransaction } from "./types";

const DEFAULT_BASE_URL = "https://666ab640-8d6a-491b-be32-e06642d051cf.mock.pstmn.io";

type SandboxAccount = {
  account_number: string;
  account_name: string;
  currency_code: string;
};

type SandboxTransaction = {
  id: string;
  amount: number;
  debit_credit: "DEBIT" | "CREDIT";
  reference: string;
  transaction_time: string;
};

export class OpenBankingNigeriaSandboxAdapter implements OpenBankingAdapter {
  private readonly baseUrl = process.env.OPEN_BANKING_SANDBOX_URL ?? DEFAULT_BASE_URL;

  async requestConsent(memberId: string) {
    // The public sandbox documents USSD consent but does not create a real,
    // user-specific bank session. Discovery still verifies the live sandbox.
    await this.get<{ data?: { consent_method?: string } }>("/discover", false);
    return {
      consentId: `obn-sandbox-${memberId.slice(0, 8)}`,
      verificationUrl: "https://apis.openbanking.ng/",
      status: "pending" as const,
    };
  }

  async getAccounts(memberId: string, memberName: string) {
    void memberId;
    void memberName;
    const response = await this.get<{ data?: { accounts?: SandboxAccount[] } }>("/accounts");
    const accounts = [...new Map(
      (response.data?.accounts ?? []).map((account) => [account.account_number, account]),
    ).values()];

    return Promise.all(accounts.map(async (account, index): Promise<BankAccount> => {
      const balanceResponse = await this.get<{ data?: { available_balance?: number } }>(
        `/accounts/${encodeURIComponent(account.account_number)}/balances`,
      );
      return {
        id: `${account.account_number}-${index}`,
        bankName: "Open Banking Nigeria sandbox",
        accountName: account.account_name,
        maskedNumber: maskAccountNumber(account.account_number),
        currency: "NGN",
        availableBalance: balanceResponse.data?.available_balance,
        source: "open_banking_nigeria_sandbox",
        isSharedSandboxFixture: true,
      };
    }));
  }

  async getAccountsForBvn(bvn: string, memberName: string) {
    const seed = [...bvn].reduce((total, character, index) => total + Number(character) * (index + 1), 0);
    const count = (seed % 4) + 1;
    const identityName = demoNames[seed % demoNames.length];
    const banks = ["Northstar Bank", "Lagos Trust Bank", "Greenfield Microfinance", "Unity Commercial Bank"];
    const balances = [185000, 420000, 76000, 315000];
    const nameVariants = [identityName, `${identityName} ${middleNames[(seed + 1) % middleNames.length]}`, `${identityName.split(" ")[0]} ${identityName.split(" ")[1]}`, `${identityName} (Savings)`];

    const accounts = Array.from({ length: count }, (_, index): BankAccount => {
      const bankIndex = (seed + index) % banks.length;
      const accountNumber = `${String(seed + index * 137).padStart(6, "0")}${String(1000 + ((seed * 17 + index * 431) % 9000))}`;
      return {
        id: `bvn-${bvn}-${index}`,
        bankName: banks[bankIndex],
        accountName: nameVariants[index],
        maskedNumber: maskAccountNumber(accountNumber),
        currency: "NGN",
        availableBalance: balances[bankIndex] + ((seed * 113 + index * 791) % 95000),
        source: "open_banking_nigeria_sandbox",
        isSharedSandboxFixture: true,
      };
    });

    void memberName;
    return { identityName, accounts };
  }

  getTransactionsForBvn(bvn: string, accounts: BankAccount[]): BankTransaction[] {
    const seed = [...bvn].reduce((total, character, index) => total + Number(character) * (index + 1), 0);
    const transactions: BankTransaction[] = [];
    for (let monthIndex = 0; monthIndex < 6; monthIndex += 1) {
      const month = new Date(Date.UTC(2026, 2 + monthIndex, 12));
      accounts.forEach((account, accountIndex) => {
        const base = Math.round((account.availableBalance ?? 0) * (0.55 + ((seed + accountIndex) % 30) / 100));
        const variation = 1 + (((seed + monthIndex * 7 + accountIndex) % 11) - 5) / 100;
        transactions.push({
          id: `${account.id}-inflow-${monthIndex}`,
          amount: Math.max(10000, Math.round(base * variation)),
          direction: "credit",
          status: "completed",
          category: "inflow",
          reference: `SANDBOX-INCOME-${monthIndex + 1}`,
          occurredAt: month.toISOString(),
        });
      });
    }
    return transactions;
  }

  async getTransactions(accountId: string, contributionAmount: number) {
    const accountNumber = accountId.split("-")[0];
    const to = new Date();
    const from = new Date(to);
    from.setUTCMonth(from.getUTCMonth() - 6);
    const query = new URLSearchParams({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      page: "null",
    });
    const response = await this.get<{ data?: { transactions?: SandboxTransaction[] } }>(
      `/accounts/${encodeURIComponent(accountNumber)}/transactions?${query}`,
    );

    return (response.data?.transactions ?? []).map((transaction, index): BankTransaction => {
      const direction = transaction.debit_credit === "CREDIT" ? "credit" : "debit";
      const looksLikeContribution = direction === "debit"
        && contributionAmount > 0
        && Math.abs(Number(transaction.amount) - contributionAmount) < 0.01;
      return {
        id: `${transaction.id}-${index}`,
        amount: Number(transaction.amount),
        direction,
        status: "completed",
        category: direction === "credit" ? "inflow" : looksLikeContribution ? "contribution" : "other",
        reference: transaction.reference,
        occurredAt: transaction.transaction_time,
      };
    });
  }

  async getMandateStatus(memberId: string) {
    void memberId;
    // No member-specific mandate exists in the shared public fixture.
    return "pending" as const;
  }

  private async get<T>(path: string, authenticated = true): Promise<T> {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (authenticated) {
      headers.Authorization = `Bearer ${process.env.OPEN_BANKING_SANDBOX_TOKEN ?? "demo"}`;
      headers.idempotency_key = crypto.randomUUID();
      headers.signature = process.env.OPEN_BANKING_SANDBOX_SIGNATURE ?? "demo";
      headers.consent_token = process.env.OPEN_BANKING_SANDBOX_CONSENT_TOKEN ?? "demo";
    }
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          headers,
          cache: "no-store",
          signal: AbortSignal.timeout(25_000),
        });
        if (!response.ok) throw new Error(`Open Banking sandbox returned ${response.status}`);
        const body = await response.json() as T & { status?: string; message?: string };
        if (body.status && body.status !== "00") throw new Error(body.message || "Open Banking sandbox request failed");
        return body;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }
}

function maskAccountNumber(accountNumber: string) {
  return `•••• ${accountNumber.slice(-4)}`;
}

const demoNames = ["Amaka Okafor", "Chinedu Eze", "Aisha Bello", "Tunde Adeyemi", "Ngozi Nwosu", "Yusuf Ibrahim", "Adaobi Musa", "Kelechi Okoro"];
const middleNames = ["Grace", "David", "Mary", "Samuel", "Rose", "Daniel"];
