"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { checkJoinEligibility } from "@/lib/demo-banking/join-eligibility";
import { OpenBankingNigeriaSandboxAdapter } from "@/lib/open-banking/sandbox-adapter";

export async function acceptInvitation(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/join/${token}`);
  const connection = user.user_metadata.sandbox_bank_connection as { bvn?: string } | undefined;
  if (!connection?.bvn) redirect(`/bank?next=/join/${token}`);

  const { data: invitation, error: invitationError } = await supabase.rpc(
    "get_invitation_by_token",
    { p_token: token },
  );
  const invitationRecord = Array.isArray(invitation) ? invitation[0] : invitation;
  const circleId = invitationRecord?.circle_id as string | undefined;
  if (invitationError || !circleId) redirect(`/join/${token}?error=invalid_invite`);

  const openBanking = new OpenBankingNigeriaSandboxAdapter();
  const snapshot = await openBanking.getAccountsForBvn(connection.bvn, user.user_metadata.full_name || "Circle member");
  const transactions = openBanking.getTransactionsForBvn(connection.bvn, snapshot.accounts);
  const eligibility = checkJoinEligibility(snapshot.accounts, transactions, Number(invitationRecord?.contribution_amount));
  if (eligibility.status === "not_eligible") redirect(`/join/${token}?error=not_eligible`);

  const { error } = await supabase.rpc("accept_circle_invitation", { p_token: token });
  if (error) redirect(`/join/${token}?error=accept_failed`);
  redirect(`/join/${token}?requested=1`);
}
