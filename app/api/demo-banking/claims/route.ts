import { createClient } from "@/utils/supabase/server";
import { buildGuardClaimLedger, calculateGuardReserve, payoutRecipient } from "@/lib/demo-banking/guard-engine";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const circleId = url.searchParams.get("circleId");
  if (!circleId) return Response.json({ error: "Circle is required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: circle }, { data: members }, { data: cycleRows }, { data: contributionRows }] = await Promise.all([
    supabase.from("circles").select("contribution_amount").eq("id", circleId).single(),
    supabase.from("circle_members").select("profile_id,payout_position").eq("circle_id", circleId).eq("status", "active").order("joined_at", { ascending: true }),
    supabase.from("circle_cycles").select("id,cycle_number").eq("circle_id", circleId).order("cycle_number", { ascending: false }),
    supabase.from("demo_contributions").select("cycle_id,profile_id,outcome").eq("circle_id", circleId),
  ]);

  if (!circle || !members?.length) return Response.json({ error: "Circle not found" }, { status: 404 });

  const cycleIds = (cycleRows ?? []).map((cycle) => cycle.id);
  const guardCredits = cycleIds.flatMap((cycleId) => {
    const cycle = (cycleRows ?? []).find((item) => item.id === cycleId);
    if (!cycle) return [];
    const beneficiary = payoutRecipient(members as Array<{ profile_id: string; payout_position: number | null }>, cycle.cycle_number);
    if (!beneficiary) return [];
    const failedForThisCycle = (contributionRows ?? []).some((contribution) => contribution.cycle_id === cycleId && contribution.profile_id === beneficiary.profile_id && contribution.outcome === "failed");
    return failedForThisCycle ? [{ applied_cycle_id: cycleId, beneficiary_id: beneficiary.profile_id }] : [];
  });

  const reserve = calculateGuardReserve(Number(circle.contribution_amount), contributionRows ?? [], guardCredits);
  return Response.json({
    reserve,
    claims: buildGuardClaimLedger(Number(circle.contribution_amount), contributionRows ?? [], guardCredits),
    viewerId: user.id,
  });
}

export async function POST(request: Request) {
  const body = await request.json() as { circleId?: string; cycleId?: string; cycleNumber?: number; amount?: number; action?: "claim" };
  const { circleId, cycleId, cycleNumber, amount, action } = body;
  const normalizedCycleNumber = Number(cycleNumber);

  if (!circleId || !cycleId || !Number.isInteger(normalizedCycleNumber) || normalizedCycleNumber < 1 || !amount || action !== "claim") {
    return Response.json({ error: "Invalid reserve claim request." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: member }, { data: cycle }, { data: contribution }] = await Promise.all([
    supabase.from("circle_members").select("profile_id,payout_position").eq("circle_id", circleId).eq("profile_id", user.id).eq("status", "active").maybeSingle(),
    supabase.from("circle_cycles").select("id,cycle_number").eq("id", cycleId).single(),
    supabase.from("demo_contributions").select("outcome").eq("cycle_id", cycleId).eq("profile_id", user.id).maybeSingle(),
  ]);

  if (!member || !cycle || !contribution || contribution.outcome !== "failed") {
    return Response.json({ error: "Only failed contributors with an active claim can request the reserve." }, { status: 403 });
  }

  const beneficiary = payoutRecipient(
    (await supabase.from("circle_members").select("profile_id,payout_position").eq("circle_id", circleId).eq("status", "active").order("joined_at", { ascending: true })).data ?? [],
    cycle.cycle_number,
  );

  if (!beneficiary || beneficiary.profile_id !== user.id) {
    return Response.json({ error: "This reserve claim is not available to your account." }, { status: 403 });
  }

  const claimPayload = {
    circle_id: circleId,
    cycle_id: cycleId,
    beneficiary_id: user.id,
    claim_amount: Number(amount),
    status: "pending",
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from("guard_claims").upsert(claimPayload, { onConflict: "circle_id,cycle_id,beneficiary_id" });
    if (error) throw error;
    return Response.json({ status: "pending", claimAmount: Number(amount), synthetic: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("guard_claims") && !message.includes("does not exist") && !message.includes("relation")) {
      return Response.json({ error: message }, { status: 400 });
    }
    return Response.json({ status: "pending", claimAmount: Number(amount), synthetic: true });
  }
}
