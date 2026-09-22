import { OpenBankingNigeriaSandboxAdapter } from "@/lib/open-banking/sandbox-adapter";
import { analyzeAccountTrend } from "@/lib/open-banking/trend-engine";
import type { BankAccount } from "@/lib/open-banking/types";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const bvn = new URL(request.url).searchParams.get("bvn")?.replace(/\D/g, "") ?? "";
  const savedConnection = user.user_metadata.sandbox_bank_connection as BankConnection | undefined;
  if (!bvn) return Response.json({ connectedAccount: savedConnection?.account ?? null });
  if (bvn.length !== 11) return Response.json({ error: "Enter an 11-digit BVN." }, { status: 400 });

  const name = user.user_metadata.full_name || "Circle member";
  const openBanking = new OpenBankingNigeriaSandboxAdapter();

  try {
    const result = await openBanking.getAccountsForBvn(bvn, name);
    return Response.json({ ...result, totalBalance: result.accounts.reduce((total, account) => total + (account.availableBalance ?? 0), 0), sandbox: true });
  } catch (error) {
    console.error("Open Banking sandbox account request failed", error);
    return Response.json({ error: "The Open Banking sandbox is temporarily unavailable." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { action?: string; contributionAmount?: number; bvn?: string; account?: BankAccount };
  const name = user.user_metadata.full_name || "Circle member";

  const openBanking = new OpenBankingNigeriaSandboxAdapter();

  try {
    if (body.action === "connect-bvn-account") {
      const bvn = body.bvn?.replace(/\D/g, "") ?? "";
      if (bvn.length !== 11 || !body.account?.id) return Response.json({ error: "A valid BVN and account are required." }, { status: 400 });
      const result = await openBanking.getAccountsForBvn(bvn, name);
      const account = result.accounts.find((item) => item.id === body.account?.id);
      if (!account) return Response.json({ error: "That sandbox account is not linked to this BVN." }, { status: 400 });
      const { error } = await supabase.auth.updateUser({ data: { sandbox_bank_connection: { bvn, account } } });
      if (error) return Response.json({ error: "Could not save the bank connection." }, { status: 500 });
      return Response.json({ connected: true, account });
    }
    if (body.action === "consent") {
      const consent = await openBanking.requestConsent(user.id);
      return Response.json({ consent });
    }
    if (body.action === "analyze") {
      const [account] = await openBanking.getAccounts(user.id, name);
      if (!account) return Response.json({ error: "The sandbox returned no accounts." }, { status: 502 });
      const transactions = await openBanking.getTransactions(account.id, Number(body.contributionAmount) || 0);
      const mandate = await openBanking.getMandateStatus(user.id);
      const trend = analyzeAccountTrend(transactions, mandate);
      return Response.json({ account, trend });
    }
  } catch (error) {
    console.error("Open Banking API request failed", error);
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.message.includes("timeout"));
    return Response.json({
      error: timedOut
        ? "The public sandbox took too long to respond. Please try again."
        : "The Open Banking sandbox is temporarily unavailable. Please try again.",
    }, { status: 502 });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}

type BankConnection = { bvn: string; account: BankAccount };

