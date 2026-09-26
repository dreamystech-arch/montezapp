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

import { sendAuthOtp, verifyAuthOtp } from "@/src/api";
import type { Role } from "@/src/api/types";
import { AdminDashboard } from "@/src/components/dashboards/AdminDashboard";
import { CustomerDashboard } from "@/src/components/dashboards/CustomerDashboard";
import { PartnerDashboard } from "@/src/components/dashboards/PartnerDashboard";
import { useApp } from "@/src/context/AppContext";
import { registerForPushAsync } from "@/src/utils/push";
import { colors, font, radius, spacing } from "@/src/theme";
import { getSessionCookie } from "@/src/api/client";
import { claimCapturedInstallReward } from "@/src/utils/referrals";

type Step = "email" | "code";
const ROLES: { value: Role; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { value: "customer", label: "Customer", icon: "person-outline" },
  { value: "partner", label: "Partner", icon: "business-outline" },
  { value: "admin", label: "Admin", icon: "shield-checkmark-outline" },
];

export default function AccountScreen() {
  const { user, setSession, signOut } = useApp();

  const [role, setRole] = useState<Role>("customer");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const onLogout = async () => {
    await signOut();
    setStep("email");
    setEmail("");
    setOtp("");
    setError(null);
    setInfo(null);
    setDemoOtp(null);
  };

  // ---- Logged-in: render dashboard by role ---------------------------------
  if (user) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {user.role === "admin" ? (
          <AdminDashboard user={user} onLogout={onLogout} />
        ) : user.role === "partner" ? (
          <PartnerDashboard user={user} onLogout={onLogout} />
        ) : (
          <CustomerDashboard user={user} onLogout={onLogout} />
        )}
      </SafeAreaView>
    );
  }

  // ---- Logged-out: email OTP flow -----------------------------------------
  const onSendCode = async () => {
    setError(null);
    setInfo(null);
    setDemoOtp(null);
    const cleaned = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(cleaned)) {
      setError("Enter a valid email");
      return;
    }
    setLoading(true);
    try {
      const res = await sendAuthOtp(cleaned, role);
      setStep("code");
      setInfo(res.message ?? `A 6-digit code has been sent to ${cleaned}.`);
      if (res.demoMode && res.demoOtp) {
        setDemoOtp(res.demoOtp);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    setError(null);
    const code = otp.trim();
    if (code.length < 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const res = await verifyAuthOtp(email.trim(), code);
      const cookie = getSessionCookie();
      await setSession(cookie, res.user);
      try {
        const reward = await claimCapturedInstallReward();
        if (reward?.eligible) setInfo("Your ₹50 install reward has been added to your wallet.");
      } catch {
        // Wallet rewards can be retried from the Wallet & Referrals screen.
      }
      if (res.user?.id) {
        registerForPushAsync(res.user.id);
      }
    } catch (e: any) {
      setError(e?.message ?? "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Passwordless email login • customer, partner or admin</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Role selector */}
          <Text style={styles.label}>I am a</Text>
          <View style={styles.roleRow} testID="role-selector-row">
            {ROLES.map((r) => {
              const active = r.value === role;
              return (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.roleChip, active && styles.roleChipActive]}
                  onPress={() => {
                    setRole(r.value);
                    setStep("email");
                    setOtp("");
                    setDemoOtp(null);
                    setInfo(null);
                    setError(null);
                  }}
                  disabled={loading}
                  activeOpacity={0.85}
                  testID={`role-chip-${r.value}`}
                >
                  <Ionicons
                    name={r.icon}
                    size={16}
                    color={active ? "#FFFFFF" : colors.onSurfaceSecondary}
                  />
                  <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {step === "email" ? (
            <>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@company.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                testID="account-email-input"
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.cta, loading && { opacity: 0.7 }]}
                onPress={onSendCode}
                disabled={loading}
                activeOpacity={0.85}
                testID="account-send-code-button"
              >
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>Send login code</Text>}
              </TouchableOpacity>
              <Text style={styles.helper}>
                Select your role, then we&apos;ll email a 6-digit code. Codes expire in 10 minutes.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>Enter the 6-digit code</Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                maxLength={6}
                testID="account-code-input"
              />
              {info ? <Text style={styles.infoText} testID="account-code-hint">{info}</Text> : null}
              {demoOtp ? (
                <Text style={styles.demoText} testID="account-demo-hint">Demo code: {demoOtp}</Text>
              ) : null}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.cta, loading && { opacity: 0.7 }]}
                onPress={onVerify}
                disabled={loading}
                activeOpacity={0.85}
                testID="account-verify-code-button"
              >
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>Verify & Sign in</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setStep("email");
                  setOtp("");
                  setError(null);
                  setInfo(null);
                  setDemoOtp(null);
                }}
                style={{ alignSelf: "center", padding: spacing.md }}
                testID="account-change-email-button"
              >
                <Text style={{ color: colors.brand, fontWeight: "500" }}>Use a different email</Text>
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
  label: { fontSize: font.sm, color: colors.onSurfaceSecondary, marginBottom: spacing.sm, fontWeight: "500", marginTop: spacing.sm },
  roleRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  roleChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roleChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  roleChipText: {
    color: colors.onSurfaceSecondary,
    fontSize: font.sm,
    fontWeight: "500",
  },
  roleChipTextActive: { color: "#FFFFFF" },
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
  infoText: { color: colors.onSurfaceSecondary, fontSize: font.sm, marginBottom: spacing.sm },
  demoText: { color: colors.warning, fontSize: font.sm, marginBottom: spacing.sm, fontWeight: "500" },
  errorText: { color: colors.error, fontSize: font.sm, marginBottom: spacing.sm },
});
