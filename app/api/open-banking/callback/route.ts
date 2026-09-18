import { officialOpenBanking } from "@/lib/open-banking";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return Response.redirect(new URL("/bank?error=bank_auth_failed", request.url));
  }

  if (!code) {
    return Response.redirect(new URL("/bank?error=missing_code", request.url));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.redirect(new URL("/auth", request.url));

  try {
    const result = await officialOpenBanking.exchangeCode(code);

    await supabase.auth.updateUser({
      data: {
        open_banking_state: state,
        open_banking_access_token: result.accessToken,
        open_banking_consent_id: result.consentId,
        open_banking_member_id: result.memberId ?? user.id,
      },
    });

    return Response.redirect(new URL("/bank?success=connected", request.url));
  } catch (caughtError) {
    console.error("Open Banking callback failed", caughtError);
    return Response.redirect(new URL("/bank?error=callback_failed", request.url));
  }
}
