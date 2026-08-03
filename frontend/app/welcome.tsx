import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApp } from "@/src/context/AppContext";
import { colors, font, radius, spacing } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const WELCOME_SEEN_KEY = "montez_welcome_seen";

export default function Welcome() {
  const router = useRouter();
  const { cms } = useApp();

  const heading = cms?.welcomeHeading ?? "India's Trusted B2B Manufacturing Platform";
  const subtext =
    cms?.welcomeSubtext ??
    "Source smarter, scale faster and build with confidence.";
  const image =
    cms?.welcomeImage ??
    "https://images.unsplash.com/photo-1590490584637-f0f83a370a95?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600";

  const onContinue = async () => {
    await storage.setItem(WELCOME_SEEN_KEY, true);
    router.replace("/(tabs)/home");
  };

  return (
    <View style={styles.container} testID="welcome-screen">
      <Image source={{ uri: image }} style={styles.bg} />
      <LinearGradient
        colors={["rgba(17,24,39,0)", "rgba(17,24,39,0.6)", "rgba(17,24,39,0.95)"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.top}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Verified • Trusted • Pan-India</Text>
          </View>
        </View>
        <View style={styles.bottom}>
          <Text style={styles.heading} testID="welcome-heading">
            {heading}
          </Text>
          <Text style={styles.subtext} testID="welcome-subtext">
            {subtext}
          </Text>
          <TouchableOpacity style={styles.cta} onPress={onContinue} testID="welcome-continue-button" activeOpacity={0.9}>
            <Text style={styles.ctaText}>Explore Products</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onContinue} style={styles.skip}>
            <Text style={styles.skipText} testID="welcome-skip-button">Skip</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  bg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", resizeMode: "cover" },
  safe: { flex: 1, justifyContent: "space-between", padding: spacing.xl },
  top: { alignItems: "flex-start" },
  badge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  badgeText: { color: "#FFFFFF", fontSize: font.sm, fontWeight: "500" },
  bottom: { paddingBottom: spacing.md },
  heading: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "500",
    marginBottom: spacing.md,
  },
  subtext: {
    color: "rgba(255,255,255,0.85)",
    fontSize: font.lg,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  cta: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
  },
  ctaText: { color: "#FFFFFF", fontSize: font.lg, fontWeight: "500" },
  skip: { alignItems: "center", paddingVertical: spacing.md },
  skipText: { color: "rgba(255,255,255,0.7)", fontSize: font.base },
});
