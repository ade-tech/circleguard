"use client";

import { useState } from "react";
import { AlertCircle, ArrowRight, Camera, Check, CheckCircle2, Fingerprint, LoaderCircle, ShieldCheck, WalletCards, X } from "lucide-react";
import type { BankAccount } from "@/lib/open-banking/types";

type Step = "bvn" | "confirm" | "face" | "accounts" | "connected";

export function SandboxAccountPreview({ initialConnection }: { initialConnection?: BankAccount }) {
  const [bvn, setBvn] = useState("");
  const [identityName, setIdentityName] = useState("");
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [step, setStep] = useState<Step>(initialConnection ? "connected" : "bvn");
  const [connectedAccount, setConnectedAccount] = useState<BankAccount | undefined>(initialConnection);
  const [showConnectNote, setShowConnectNote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  async function verifyBvn(event: React.FormEvent) {
    event.preventDefault();
    const cleanedBvn = bvn.replace(/\D/g, "");
    if (cleanedBvn.length !== 11) {
      setError("Enter any 11-digit demo BVN.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/open-banking/demo?bvn=${cleanedBvn}`, { cache: "no-store" });
      const data = await response.json() as { identityName?: string; accounts?: BankAccount[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not verify this BVN.");
      setIdentityName(data.identityName ?? "Demo customer");
      setAccounts(data.accounts ?? []);
      setStep("confirm");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not verify this BVN.");
    } finally {
      setLoading(false);
    }
  }

  function confirmIdentity() {
    setError("");
    setStep("face");
  }

  function scanFace() {
    setScanning(true);
    setError("");
    window.setTimeout(() => {
      setScanning(false);
      setStep("accounts");
    }, 1400);
  }

  function startOver() {
    setBvn("");
    setIdentityName("");
    setAccounts([]);
    setError("");
    setStep("bvn");
  }

  async function connectBank() {
    const account = accounts[0];
    if (!account) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/open-banking/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connect-bvn-account", bvn, account }) });
      const data = await response.json() as { account?: BankAccount; error?: string };
      if (!response.ok || !data.account) throw new Error(data.error || "Could not connect this bank.");
      setConnectedAccount(data.account);
      setShowConnectNote(false);
      window.location.href = "/bank?connected=1";
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not connect this bank.");
      setLoading(false);
    }
  }

  const totalBalance = accounts.reduce((total, account) => total + (account.availableBalance ?? 0), 0);
  const stepIndex = ["bvn", "confirm", "face", "accounts", "connected"].indexOf(step);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#dbe6e0] bg-[#f7faf8]">
      <div className="flex items-start gap-3 border-b border-[#e2ebe6] px-5 py-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#286d52] shadow-sm"><Fingerprint size={19} /></span>
        <div>
          <h2 className="font-semibold text-[#19352b]">Verify your BVN</h2>
          <p className="mt-1 text-sm text-[#718079]">Confirm the identity, complete a face scan, and view linked accounts.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-[#e2ebe6] px-5 py-3 text-xs font-semibold text-[#718079]">
        {["BVN", "Confirm", "Face scan", "Accounts", "Connected"].map((label, index) => <div key={label} className={`flex items-center gap-2 ${index <= stepIndex ? "text-[#286d52]" : "text-[#9aa8a1]"}`}><span className={`grid size-6 place-items-center rounded-full border text-[11px] ${index < stepIndex ? "border-[#286d52] bg-[#286d52] text-white" : index === stepIndex ? "border-[#286d52] bg-white text-[#286d52] ring-2 ring-[#d7ebe0]" : "border-[#cbd8d1] bg-white"}`}>{index < stepIndex ? <Check size={13} strokeWidth={3} /> : index + 1}</span><span className="hidden sm:inline">{label}</span>{index < 4 && <ArrowRight size={13} />}</div>)}
      </div>

      <div className="p-5">
        {step === "bvn" && <form className="space-y-4" onSubmit={verifyBvn}>
          <div className="rounded-xl border border-[#dfe9e4] bg-white p-4 text-sm leading-6 text-[#5e716a]">Enter any 11-digit demo BVN. The sandbox will return a dummy identity and linked bank network.</div>
          <label className="block text-sm font-semibold text-[#1a2d28]">BVN<input className="input mt-2" value={bvn} onChange={(event) => setBvn(event.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="Enter your 11-digit BVN" inputMode="numeric" maxLength={11} /></label>
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#123f31] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{loading ? <LoaderCircle size={16} className="animate-spin" /> : <Fingerprint size={16} />}{loading ? "Verifying…" : "Verify BVN"}</button>
        </form>}

        {step === "confirm" && <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#e5f4ec] text-[#247352]"><CheckCircle2 size={27} /></span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#718079]">Identity found</p>
          <h3 className="mt-2 text-2xl font-bold text-[#19352b]">{identityName}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64756e]">Is this your name? Confirm to connect the bank accounts linked to this BVN.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={confirmIdentity} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#123f31] px-5 py-3 text-sm font-semibold text-white">Yes, this is me <ArrowRight size={16} /></button><button type="button" onClick={startOver} className="rounded-xl border border-[#d4e0da] px-5 py-3 text-sm font-semibold text-[#52655d]">No, go back</button></div>
        </div>}

        {step === "face" && <div className="text-center">
          <div className="mx-auto flex h-56 max-w-sm items-center justify-center rounded-2xl border-2 border-dashed border-[#bfd3c8] bg-white"><div><div className="mx-auto grid size-14 place-items-center rounded-full bg-[#123f31] text-white"><Camera size={25} /></div><h3 className="mt-3 font-semibold text-[#19352b]">Face verification</h3><p className="mt-1 max-w-xs text-xs leading-5 text-[#718079]">Place your face inside the frame so we can confirm this BVN belongs to you.</p></div></div>
          <button type="button" onClick={scanFace} disabled={scanning} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#123f31] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{scanning ? <LoaderCircle size={16} className="animate-spin" /> : <Camera size={16} />}{scanning ? "Scanning face…" : "Scan my face"}</button>
        </div>}

        {step === "accounts" && <div>
          <div className="flex items-center gap-3 rounded-xl border border-[#cfe3d7] bg-[#eaf7ef] p-4"><ShieldCheck size={20} className="text-[#247352]" /><div><p className="font-semibold text-[#19352b]">Face verified</p><p className="text-sm text-[#5d7468]">Accounts linked to {identityName}</p></div></div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#d6e5dc] bg-white p-4"><div><p className="text-xs uppercase tracking-[0.12em] text-[#788981]">Connected banks</p><p className="mt-1 text-2xl font-bold text-[#19352b]">{accounts.length}</p></div><div className="text-right"><p className="text-xs uppercase tracking-[0.12em] text-[#788981]">Total network balance</p><p className="mt-1 text-xl font-bold text-[#286d52]">{formatMoney(totalBalance)}</p></div></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{accounts.map((account) => <div key={account.id} className="rounded-xl border border-[#e0eae4] bg-white p-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-[#edf4f0] text-[#286d52]"><WalletCards size={17} /></span><div className="min-w-0"><p className="truncate font-semibold text-[#19352b]">{account.bankName}</p><p className="mt-1 text-xs text-[#718079]">{account.accountName} · {account.maskedNumber}</p></div></div><p className="mt-4 text-sm font-semibold text-[#286d52]">Balance: {formatMoney(account.availableBalance ?? 0)}</p></div>)}</div>
          <button type="button" onClick={() => setShowConnectNote(true)} disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#123f31] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{loading ? <LoaderCircle size={16} className="animate-spin" /> : <WalletCards size={16} />}Connect bank</button>
        </div>}

        {step === "connected" && connectedAccount && <div>
          <div className="flex items-center gap-3 rounded-xl border border-[#cfe3d7] bg-[#eaf7ef] p-4"><ShieldCheck size={21} className="text-[#247352]" /><div><p className="font-semibold text-[#19352b]">Bank connected</p><p className="text-sm text-[#5d7468]">Your bank account is linked and ready for CircleGuard.</p></div></div>
          <div className="mt-4 rounded-xl border border-[#e0eae4] bg-white p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[#edf4f0] text-[#286d52]"><WalletCards size={19} /></span><div><p className="font-semibold text-[#19352b]">{connectedAccount.bankName}</p><p className="mt-1 text-sm text-[#718079]">{connectedAccount.accountName} · {connectedAccount.maskedNumber}</p></div></div><p className="mt-5 text-lg font-bold text-[#286d52]">Balance: {formatMoney(connectedAccount.availableBalance ?? 0)}</p></div>
          <p className="mt-4 text-center text-xs text-[#718079]">This bank cannot be disconnected while you are a member of a circle.</p>
        </div>}

        {error && <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#fff5f2] p-3 text-sm text-[#a34b35]"><AlertCircle size={16} /> {error}</div>}
        <p className="mt-4 text-center text-xs text-[#909a95]">Sandbox demo only. No real BVN, face scan, or bank data is used.</p>
      </div>

      {showConnectNote && <div className="fixed inset-0 z-50 grid place-items-center bg-[#10231d]/45 p-5" role="dialog" aria-modal="true" aria-labelledby="connect-note-title"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2b7659]">Important note</p><h3 id="connect-note-title" className="mt-2 text-xl font-bold text-[#19352b]">Before you connect your bank</h3></div><button type="button" onClick={() => setShowConnectNote(false)} className="grid size-8 place-items-center rounded-lg text-[#718079] hover:bg-[#f1f5f2]" aria-label="Close"><X size={18} /></button></div><p className="mt-4 text-sm leading-6 text-[#5e716a]">Once you join a savings circle, you cannot disconnect this bank account unless you are no longer a member of a circle.</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowConnectNote(false)} className="rounded-xl border border-[#d4e0da] px-4 py-3 text-sm font-semibold text-[#52655d]">Cancel</button><button type="button" onClick={connectBank} disabled={loading} className="rounded-xl bg-[#123f31] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Connecting…" : "Connect bank"}</button></div></div></div>}
    </section>
  );
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
}
