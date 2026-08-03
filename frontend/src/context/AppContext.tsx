import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { fetchMobileCMS, fetchSettings } from "@/src/api";
import type { MobileCMS, SiteSettings, User } from "@/src/api/types";
import { storage } from "@/src/utils/storage";

const TOKEN_KEY = "montez_auth_token";
const USER_KEY = "montez_auth_user";

type AppContextValue = {
  cms: MobileCMS | null;
  settings: SiteSettings | null;
  loadingBoot: boolean;
  bootError: string | null;
  refreshBoot: () => Promise<void>;
  user: User | null;
  token: string | null;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cms, setCms] = useState<MobileCMS | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loadingBoot, setLoadingBoot] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const refreshBoot = useCallback(async () => {
    setLoadingBoot(true);
    setBootError(null);
    try {
      const [cmsRes, settingsRes] = await Promise.allSettled([
        fetchMobileCMS(),
        fetchSettings(),
      ]);
      if (cmsRes.status === "fulfilled") setCms(cmsRes.value);
      if (settingsRes.status === "fulfilled") setSettings(settingsRes.value);
      if (cmsRes.status === "rejected" && settingsRes.status === "rejected") {
        setBootError("Unable to reach servers. Pull to retry.");
      }
    } catch (e: any) {
      setBootError(e?.message ?? "Failed to load");
    } finally {
      setLoadingBoot(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [savedToken, savedUser] = await Promise.all([
        storage.secureGet<string>(TOKEN_KEY, ""),
        storage.getItem<string>(USER_KEY, ""),
      ]);
      if (savedToken) setToken(savedToken);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser) as User);
        } catch {
          /* ignore */
        }
      }
      await refreshBoot();
    })();
  }, [refreshBoot]);

  const signIn = useCallback(async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    await storage.secureSet(TOKEN_KEY, newToken);
    await storage.setItem(USER_KEY, JSON.stringify(newUser));
  }, []);

  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
    await storage.secureRemove(TOKEN_KEY);
    await storage.removeItem(USER_KEY);
  }, []);

  const value = useMemo(
    () => ({ cms, settings, loadingBoot, bootError, refreshBoot, user, token, signIn, signOut }),
    [cms, settings, loadingBoot, bootError, refreshBoot, user, token, signIn, signOut],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
