import "server-only";
import { OfficialOpenBankingAdapter } from "./official-adapter";
import { OpenBankingNigeriaSandboxAdapter } from "./sandbox-adapter";

const useOfficialProvider = Boolean(process.env.OPEN_BANKING_BASE_URL && process.env.OPEN_BANKING_CLIENT_ID && process.env.OPEN_BANKING_CLIENT_SECRET);

export const openBanking = useOfficialProvider
  ? new OfficialOpenBankingAdapter()
  : new OpenBankingNigeriaSandboxAdapter();

export const officialOpenBanking = new OfficialOpenBankingAdapter();
