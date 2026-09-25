import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppProvider } from "@/src/context/AppContext";
import { CartProvider } from "@/src/context/CartContext";
import { ToastProvider } from "@/src/context/ToastContext";
import { storage } from "@/src/utils/storage";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";

LogBox.ignoreAllLogs(true);

// Keep native splash visible from cold start until icon fonts register.
SplashScreen.preventAutoHideAsync();

// --- Push: module-scope handlers (playbook mandate) ---
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
  });
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  const router = useRouter();

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data || {}) as Record<string, string>;
      const url = data.deeplink || data.action_url;
      if (!url) return;
      if (url.startsWith("http")) {
        Linking.openURL(url);
      } else {
        router.push(url as any);
      }
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = (response.notification.request.content.data || {}) as Record<string, string>;
      const url = data.deeplink || data.action_url;
      if (!url) return;
      if (url.startsWith("http")) {
        Linking.openURL(url);
      } else {
        router.push(url as any);
      }
    });

    (async () => {
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      if (status !== "denied" || canAskAgain) return;
      const lastNudge = await storage.getItem<string>("pushNudgeAt", "");
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      if (lastNudge && Date.now() - Number(lastNudge) <= oneWeek) return;
      // We do not render a dialog here (no modal system available); silently defer.
      await storage.setItem("pushNudgeAt", String(Date.now()));
    })();

    return () => {
      tapSub.remove();
    };
  }, [router]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <CartProvider>
            <ToastProvider>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FFFFFF" } }} />
            </ToastProvider>
          </CartProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
