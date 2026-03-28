import { cookies } from "next/headers";

export function getAccountId(): number {
  const val = cookies().get("cdp_account_id")?.value;
  return val ? parseInt(val) : 1;
}
