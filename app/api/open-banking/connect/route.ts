import { OpenBankingNigeriaSandboxAdapter } from "@/lib/open-banking/sandbox-adapter";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { memberId?: string; next?: string };
  const memberId = body.memberId ?? user.id;
  const adapter = new OpenBankingNigeriaSandboxAdapter();

  try {
    const consent = await adapter.requestConsent(memberId);
    return Response.json({ consent, next: body.next ?? "/bank" });
  } catch (error) {
    console.error("Consent request failed", error);
    return Response.json({ error: "Consent request failed. Please try again." }, { status: 502 });
  }
}
