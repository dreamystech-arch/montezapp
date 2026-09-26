import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

import { authLogout, fetchMe, fetchMobileCMS, fetchSettings } from "@/src/api";
import { setSessionCookie } from "@/src/api/client";
import type { MobileCMS, SiteSettings, User } from "@/src/api/types";
import { storage } from "@/src/utils/storage";
import { capturePlayInstallReferrer } from "@/src/utils/referrals";

const SESSION_COOKIE_KEY = "montez_session_cookie";
const USER_KEY = "montez_auth_user";

type AppContextValue = {
  cms: MobileCMS | null;
  settings: SiteSettings | null;
  loadingBoot: boolean;
  bootError: string | null;
  refreshBoot: () => Promise<void>;
  refreshCMS: () => Promise<void>;
  user: User | null;
  refreshUser: () => Promise<User | null>;
  setSession: (cookie: string | null, user: User | null) => Promise<void>;
  signOut: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cms, setCms] = useState<MobileCMS | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loadingBoot, setLoadingBoot] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Lightweight CMS-only refresh. Fetches on every call so admin edits reflect
  // immediately when the user comes back to a screen or foregrounds the app.
  const refreshCMS = useCallback(async () => {
    try {
      const [cmsRes, settingsRes] = await Promise.allSettled([
        fetchMobileCMS(),
        fetchSettings(),
      ]);
      if (cmsRes.status === "fulfilled") setCms(cmsRes.value);
      if (settingsRes.status === "fulfilled") setSettings(settingsRes.value);
    } catch {
      /* silent — background refresh should never surface errors */
    }
  }, []);

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

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const { user: me } = await fetchMe();
      setUser(me);
      if (me) {
        await storage.setItem(USER_KEY, JSON.stringify(me));
      } else {
        await storage.removeItem(USER_KEY);
      }
      return me;
    } catch {
      return null;
    }
  }, []);

  const setSession = useCallback(async (cookie: string | null, nextUser: User | null) => {
    setSessionCookie(cookie);
    setUser(nextUser);
    if (cookie) {
      await storage.secureSet(SESSION_COOKIE_KEY, cookie);
    } else {
      await storage.secureRemove(SESSION_COOKIE_KEY);
    }
    if (nextUser) {
      await storage.setItem(USER_KEY, JSON.stringify(nextUser));
    } else {
      await storage.removeItem(USER_KEY);
    }
  }, []);

  const signOut = useCallback(async () => {
    await authLogout();
    await setSession(null, null);
  }, [setSession]);

  useEffect(() => {
    void capturePlayInstallReferrer();
    (async () => {
      const [savedCookie, savedUser] = await Promise.all([
        storage.secureGet<string>(SESSION_COOKIE_KEY, ""),
        storage.getItem<string>(USER_KEY, ""),
      ]);
      if (savedCookie) setSessionCookie(savedCookie);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser) as User);
        } catch {
          /* ignore */
        }
      }
      await Promise.all([refreshBoot(), savedCookie ? refreshUser() : Promise.resolve(null)]);
    })();
  }, [refreshBoot, refreshUser]);

  // Auto-refresh CMS + settings when the app returns to the foreground so
  // admin edits made while the app was backgrounded show up on next view.
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev.match(/inactive|background/) && nextState === "active") {
        refreshCMS();
      }
    });
    return () => sub.remove();
  }, [refreshCMS]);

  const value = useMemo(
    () => ({
      cms,
      settings,
      loadingBoot,
      bootError,
      refreshBoot,
      refreshCMS,
      user,
      refreshUser,
      setSession,
      signOut,
    }),
    [cms, settings, loadingBoot, bootError, refreshBoot, refreshCMS, user, refreshUser, setSession, signOut],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
