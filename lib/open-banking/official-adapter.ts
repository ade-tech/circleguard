import type { OpenBankingAdapter } from "./adapter";
import type { BankAccount, BankTransaction, ConsentResult, MandateStatus } from "./types";

type OfficialProviderConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
  tokenUrl: string;
  audience?: string;
};

export class OfficialOpenBankingAdapter implements OpenBankingAdapter {
  private readonly config: OfficialProviderConfig;

  constructor() {
    this.config = {
      baseUrl: process.env.OPEN_BANKING_BASE_URL ?? "",
      clientId: process.env.OPEN_BANKING_CLIENT_ID ?? "",
      clientSecret: process.env.OPEN_BANKING_CLIENT_SECRET ?? "",
      redirectUrl: process.env.OPEN_BANKING_REDIRECT_URL ?? "http://localhost:3000/api/open-banking/callback",
      tokenUrl: process.env.OPEN_BANKING_TOKEN_URL ?? "",
      audience: process.env.OPEN_BANKING_AUDIENCE ?? undefined,
    };
  }

  async requestConsent(memberId: string): Promise<ConsentResult> {
    this.ensureConfigured();

    const body = {
      memberId,
      redirectUri: this.config.redirectUrl,
      scope: ["accounts", "transactions", "identity"],
      state: crypto.randomUUID(),
      audience: this.config.audience,
    };

    const response = await this.fetchJson<{ consentId?: string; verificationUrl?: string; redirectUrl?: string; status?: string }>(
      `${this.config.baseUrl}/consent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64")}`,
        },
        body: JSON.stringify(body),
      },
    );

    const consentId = response.consentId ?? crypto.randomUUID();
    const verificationUrl = response.verificationUrl ?? response.redirectUrl ?? this.config.redirectUrl;

    return {
      consentId,
      verificationUrl,
      status: response.status === "approved" ? "approved" : "pending",
    };
  }

  async getAccounts(memberId: string, memberName: string): Promise<BankAccount[]> {
    this.ensureConfigured();
    const token = await this.getAccessToken();
    const response = await this.fetchJson<{ data?: Array<{ id?: string; accountId?: string; accountName?: string; accountNumber?: string; bankName?: string; currency?: string; availableBalance?: number }> }>(
      `${this.config.baseUrl}/accounts?memberId=${encodeURIComponent(memberId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Member-Name": memberName,
        },
      },
    );

    const accounts = response.data ?? [];

    return accounts.map((account, index) => ({
      id: account.id ?? account.accountId ?? `${memberId}-${index}`,
      bankName: account.bankName ?? "Verified bank account",
      accountName: account.accountName ?? "Primary account",
      maskedNumber: maskAccountNumber(account.accountNumber ?? "0000000000"),
      currency: (account.currency ?? "NGN") as "NGN",
      availableBalance: account.availableBalance,
      source: "official_bank_provider",
      isSharedSandboxFixture: false,
    }));
  }

  async getTransactions(accountId: string, contributionAmount: number): Promise<BankTransaction[]> {
    this.ensureConfigured();
    const token = await this.getAccessToken();
    const response = await this.fetchJson<{ data?: Array<{ id?: string; amount?: number; direction?: "credit" | "debit"; status?: "completed" | "failed" | "pending"; category?: "inflow" | "contribution" | "other"; reference?: string; occurredAt?: string; dueAt?: string }> }>(
      `${this.config.baseUrl}/accounts/${encodeURIComponent(accountId)}/transactions`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    return (response.data ?? []).map((transaction, index) => ({
      id: transaction.id ?? `${accountId}-${index}`,
      amount: Number(transaction.amount ?? 0),
      direction: transaction.direction ?? "credit",
      status: transaction.status ?? "completed",
      category: transaction.category ?? "other",
      reference: transaction.reference ?? `txn-${index}`,
      occurredAt: transaction.occurredAt ?? new Date().toISOString(),
      dueAt: transaction.dueAt,
    }));
  }

  async getMandateStatus(memberId: string): Promise<MandateStatus> {
    this.ensureConfigured();
    const token = await this.getAccessToken();
    const response = await this.fetchJson<{ status?: string }>(
      `${this.config.baseUrl}/mandates/${encodeURIComponent(memberId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    return (response.status as MandateStatus) ?? "pending";
  }

  async exchangeCode(code: string) {
    this.ensureConfigured();
    const response = await this.fetchJson<{ access_token?: string; token_type?: string; expires_in?: number; scope?: string; consentId?: string; memberId?: string }>(
      this.config.tokenUrl || `${this.config.baseUrl}/oauth/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64")}`,
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: this.config.redirectUrl,
          audience: this.config.audience,
        }),
      },
    );

    return {
      accessToken: response.access_token,
      expiresIn: response.expires_in,
      consentId: response.consentId,
      memberId: response.memberId,
    };
  }

  private async getAccessToken() {
    this.ensureConfigured();

    if (!this.config.tokenUrl) {
      throw new Error("OPEN_BANKING_TOKEN_URL is required to use the official Open Banking provider.");
    }

    const response = await this.fetchJson<{ access_token?: string; token_type?: string; expires_in?: number }>(
      this.config.tokenUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64")}`,
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
          audience: this.config.audience,
        }),
      },
    );

    if (!response.access_token) {
      throw new Error("The Open Banking provider returned no access token.");
    }

    return response.access_token;
  }

  private async fetchJson<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Open Banking request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private ensureConfigured() {
    if (!this.config.baseUrl || !this.config.clientId || !this.config.clientSecret) {
      throw new Error(
        "Open Banking official provider is not configured. Set OPEN_BANKING_BASE_URL, OPEN_BANKING_CLIENT_ID, and OPEN_BANKING_CLIENT_SECRET.",
      );
    }
  }
}

function maskAccountNumber(value: string) {
  return `•••• ${value.replace(/\D/g, "").slice(-4) || "0000"}`;
}
