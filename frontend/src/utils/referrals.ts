import { Platform } from "react-native";

import { claimInstallReward } from "@/src/api";
import { storage } from "@/src/utils/storage";

const CHECKED_KEY = "montez_play_referrer_checked";
const PROOF_KEY = "montez_play_referrer_verified";
const CODE_KEY = "montez_pending_referral_code";
const RAW_REFERRER_KEY = "montez_play_install_referrer";
let pendingCapture: Promise<void> | null = null;

function extractReferralCode(value: string) {
  let raw = String(value || "").replace(/^\?/, "");
  try { if (/%3D|%26/i.test(raw)) raw = decodeURIComponent(raw); } catch {}
  const params = new URLSearchParams(raw);
  const code = params.get("referral_code") || params.get("code") || "";
  return code.trim().toUpperCase();
}

/** Read Play's referrer once on Android and remember it until the new user signs in. */
async function capturePlayInstallReferrerOnce() {
  if (Platform.OS !== "android") return;
  if (await storage.getItem<boolean>(CHECKED_KEY, false)) return;

  try {
    const { PlayInstallReferrer } = await import("react-native-play-install-referrer");
    const info = await new Promise<{ installReferrer?: string | null }>((resolve, reject) => {
      PlayInstallReferrer.getInstallReferrerInfo((value, error) => {
        if (error) reject(new Error(error.message || "Play referral information unavailable"));
        else resolve(value || {});
      });
    });
    const rawReferrer = String(info.installReferrer || "");
    if (!rawReferrer) return;
    const code = extractReferralCode(rawReferrer);
    await storage.setItem(CODE_KEY, code);
    await storage.setItem(RAW_REFERRER_KEY, rawReferrer);
    await storage.setItem(PROOF_KEY, true);
    await storage.setItem(CHECKED_KEY, true);
  } catch {
    // A store-free preview or a sideloaded development build has no Play referrer.
    // Leave the check open so a later Play-installed build can still capture it.
  }
}

export async function capturePlayInstallReferrer() {
  if (pendingCapture) return pendingCapture;
  pendingCapture = capturePlayInstallReferrerOnce();
  try { await pendingCapture; }
  finally { pendingCapture = null; }
}

/** Apply the captured install reward after the account is verified by email OTP. */
export async function claimCapturedInstallReward() {
  if (Platform.OS !== "android") return null;
  await capturePlayInstallReferrer();
  if (!(await storage.getItem<boolean>(PROOF_KEY, false))) return null;
  const code = (await storage.getItem<string>(CODE_KEY, "")) || "";
  const installReferrer = (await storage.getItem<string>(RAW_REFERRER_KEY, "")) || "";
  const result = await claimInstallReward(code, installReferrer);
  if (result.ok) {
    await storage.removeItem(PROOF_KEY);
    await storage.removeItem(CODE_KEY);
    await storage.removeItem(RAW_REFERRER_KEY);
  }
  return result;
}
