import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerPush } from "@/src/api";

export async function registerForPushAsync(userId: string) {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
    const tokenResp = await Notifications.getDevicePushTokenAsync();
    await registerPush({
      user_id: userId,
      platform: Platform.OS,
      device_token: tokenResp.data as string,
    });
  } catch (e) {
    // Best-effort — never block the app flow.
    console.warn("[push] register failed", e);
  }
}
