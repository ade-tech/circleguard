import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SandboxAccountPreview } from "@/components/sandbox-account-preview";
import type { BankAccount } from "@/lib/open-banking/types";
import { createClient } from "@/utils/supabase/server";

export default async function BankPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const connection = user?.user_metadata.sandbox_bank_connection as { account?: BankAccount } | undefined;
  return <AppShell active="Bank connections"><main className="p-5 sm:p-7 xl:p-10"><div className="mx-auto max-w-3xl"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-[#66736d]"><ArrowLeft size={16} /> Back to overview</Link><div className="mt-6"><p className="text-sm font-semibold text-[#2b7659]">BANK CONNECTION</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{connection?.account ? "Bank connected" : "Verify your BVN"}</h1><p className="mt-2 text-sm leading-6 text-[#6f7b76]">{connection?.account ? "Your verified sandbox bank account is linked to CircleGuard." : "Enter any 11-digit demo BVN to view the bank accounts linked to that identity."}</p></div><SandboxAccountPreview initialConnection={connection?.account} /></div></main></AppShell>;
}
