"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Account } from "@/db/schema";

type AccountContextType = {
  accounts: Account[];
  activeAccountId: number;
  activeAccount: Account | null;
  switchAccount: (id: number) => void;
  createAccount: (name: string) => Promise<Account | null>;
  refreshAccounts: () => void;
};

const AccountContext = createContext<AccountContextType>({
  accounts: [],
  activeAccountId: 1,
  activeAccount: null,
  switchAccount: () => {},
  createAccount: async () => null,
  refreshAccounts: () => {},
});

export function useAccount() {
  return useContext(AccountContext);
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<number>(1);

  async function loadAccounts() {
    try {
      const res = await fetch("/api/accounts");
      const data: Account[] = await res.json();
      setAccounts(data);

      // Read active account from cookie
      const cookieVal = document.cookie
        .split("; ")
        .find((r) => r.startsWith("cdp_account_id="))
        ?.split("=")[1];

      const storedId = cookieVal ? parseInt(cookieVal) : null;
      const validId = storedId && data.find((a) => a.id === storedId) ? storedId : data[0]?.id ?? 1;
      setActiveAccountId(validId);
      setCookie(validId);
    } catch {}
  }

  useEffect(() => { loadAccounts(); }, []);

  function setCookie(id: number) {
    document.cookie = `cdp_account_id=${id}; path=/; max-age=31536000`;
  }

  function switchAccount(id: number) {
    setActiveAccountId(id);
    setCookie(id);
    window.location.reload();
  }

  async function createAccount(name: string): Promise<Account | null> {
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return null;
      const created: Account = await res.json();
      await loadAccounts();
      return created;
    } catch {
      return null;
    }
  }

  const activeAccount = accounts.find((a) => a.id === activeAccountId) ?? null;

  return (
    <AccountContext.Provider value={{
      accounts,
      activeAccountId,
      activeAccount,
      switchAccount,
      createAccount,
      refreshAccounts: loadAccounts,
    }}>
      {children}
    </AccountContext.Provider>
  );
}
