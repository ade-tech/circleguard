import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OpenBankingDemo } from "@/components/open-banking-demo";
import { createClient } from "@/utils/supabase/server";

export default async function BankConnectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: circle } = await supabase.from("circles").select("id,name,contribution_amount").eq("id", id).single();
  if (!circle) notFound();
  return <AppShell active="Bank connections"><main className="p-5 sm:p-7 xl:p-10"><div className="mx-auto max-w-3xl"><Link href={`/circles/${id}`} className="inline-flex items-center gap-2 text-sm font-medium text-[#66736d]"><ArrowLeft size={16} /> Back to {circle.name}</Link><div className="mt-6"><p className="text-sm font-semibold text-[#2b7659]">IDENTITY VERIFICATION</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Verify BVN and link account</h1><p className="mt-2 text-sm leading-6 text-[#6f7b76]">Use the member’s BVN, confirm their face, and select the correct account before the circle can proceed.</p></div><div className="mt-8"><OpenBankingDemo circleId={id} contributionAmount={Number(circle.contribution_amount)} /></div></div></main></AppShell>;
}
