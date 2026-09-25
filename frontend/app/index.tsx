import { useEffect, useMemo } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useApp } from "@/src/context/AppContext";
import { colors, font, spacing } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const WELCOME_SEEN_KEY = "montez_welcome_seen";

export default function Splash() {
  const router = useRouter();
  const { cms, loadingBoot } = useApp();

  const duration = useMemo(() => cms?.splashDurationMs ?? 1600, [cms?.splashDurationMs]);

  useEffect(() => {
    if (loadingBoot) return;
    const t = setTimeout(async () => {
      const seen = await storage.getItem<boolean>(WELCOME_SEEN_KEY, false);
      router.replace(seen ? "/(tabs)/home" : "/welcome");
    }, duration);
    return () => clearTimeout(t);
  }, [duration, loadingBoot, router]);

  return (
    <View style={styles.container} testID="splash-screen">
      {cms?.splashImage ? (
        <Image source={{ uri: cms.splashImage }} style={styles.bg} resizeMode="cover" testID="splash-image" />
      ) : null}
      <View style={styles.overlay} />
      <View style={styles.content}>
        {cms?.appLogo ? (
          <Image source={{ uri: cms.appLogo }} style={styles.logo} resizeMode="contain" testID="splash-logo" />
        ) : (
          <Text style={styles.brand}>Montez Infobyte</Text>
        )}
        <Text style={styles.tagline} testID="splash-tagline">
          B2B Manufacturing & Procurement
        </Text>
        <ActivityIndicator size="small" color={colors.brand} style={{ marginTop: spacing.xl }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  bg: { ...StyleSheet.absoluteFillObject, opacity: 0.6 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.35)" },
  content: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
  logo: { width: 200, height: 100, marginBottom: spacing.md },
  brand: {
    fontSize: 28,
    color: colors.brand,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: font.base,
    color: colors.muted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
