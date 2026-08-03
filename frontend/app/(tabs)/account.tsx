import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { sendOtp, verifyOtp } from "@/src/api";
import { useApp } from "@/src/context/AppContext";
import { registerForPushAsync } from "@/src/utils/push";
import { colors, font, radius, shadow, spacing } from "@/src/theme";

type Step = "phone" | "otp";

export default function AccountScreen() {
  const { user, signIn, signOut } = useApp();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);

  const onSendOtp = async () => {
    const clean = phone.replace(/\s+/g, "");
    if (clean.length < 8) {
      setError("Enter a valid phone number");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await sendOtp(clean);
      setStep("otp");
      setDevHint(res.devOtp ? `Dev OTP: ${res.devOtp}` : null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    const clean = phone.replace(/\s+/g, "");
    if (otp.trim().length < 4) {
      setError("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await verifyOtp(clean, otp.trim());
      await signIn(res.token, res.user);
      registerForPushAsync(res.user.id);
      setStep("phone");
      setPhone("");
      setOtp("");
      setDevHint(null);
    } catch (e: any) {
      setError(e?.message ?? "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    await signOut();
  };

  if (user) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Account</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.phone.slice(-2)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName} testID="account-user-phone">
                {user.phone}
              </Text>
              <Text style={styles.profileMeta}>Member since {new Date(user.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>

          {(
            [
              { icon: "document-text-outline", label: "My Quotes", testID: "account-quotes" },
              { icon: "bag-handle-outline", label: "Orders", testID: "account-orders" },
              { icon: "bookmark-outline", label: "Saved Products", testID: "account-saved" },
              { icon: "notifications-outline", label: "Notifications", testID: "account-notifications" },
            ] as const
          ).map((row) => (
            <TouchableOpacity key={row.testID} style={styles.row} testID={row.testID} activeOpacity={0.85}>
              <Ionicons name={row.icon as any} size={20} color={colors.brand} />
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.logout} onPress={onLogout} testID="account-logout-button" activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={18} color={colors.brand} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>OTP-based login to track your quotes and orders</Text>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
          {step === "phone" ? (
            <>
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                testID="account-phone-input"
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.cta, loading && { opacity: 0.7 }]}
                onPress={onSendOtp}
                disabled={loading}
                activeOpacity={0.85}
                testID="account-send-otp-button"
              >
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>Send OTP</Text>}
              </TouchableOpacity>
              <Text style={styles.helper}>You&apos;ll receive a 6-digit verification code.</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>Enter OTP</Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                maxLength={6}
                testID="account-otp-input"
              />
              {devHint ? <Text style={styles.devHint} testID="account-dev-hint">{devHint}</Text> : null}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.cta, loading && { opacity: 0.7 }]}
                onPress={onVerify}
                disabled={loading}
                activeOpacity={0.85}
                testID="account-verify-otp-button"
              >
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>Verify & Sign in</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setStep("phone");
                  setOtp("");
                  setError(null);
                }}
                style={{ alignSelf: "center", padding: spacing.md }}
                testID="account-change-phone-button"
              >
                <Text style={{ color: colors.brand, fontWeight: "500" }}>Change phone number</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: font.xxl, color: colors.onSurface, fontWeight: "500" },
  subtitle: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  label: { fontSize: font.sm, color: colors.onSurfaceSecondary, marginBottom: spacing.xs, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: font.lg,
    color: colors.onSurface,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  cta: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  ctaText: { color: "#FFFFFF", fontSize: font.lg, fontWeight: "500" },
  helper: { color: colors.muted, fontSize: font.sm, marginTop: spacing.md, textAlign: "center" },
  devHint: { color: colors.warning, fontSize: font.sm, marginBottom: spacing.md },
  errorText: { color: colors.error, fontSize: font.sm, marginBottom: spacing.sm },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: font.lg, fontWeight: "500" },
  profileName: { fontSize: font.lg, color: colors.onSurface, fontWeight: "500" },
  profileMeta: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  rowLabel: { flex: 1, fontSize: font.base, color: colors.onSurface, fontWeight: "500" },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  logoutText: { color: colors.brand, fontWeight: "500", fontSize: font.base },
});
