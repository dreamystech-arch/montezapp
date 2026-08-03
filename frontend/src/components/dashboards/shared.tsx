import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, font, radius, shadow, spacing } from "@/src/theme";
import type { User } from "@/src/api/types";

export function DashboardHeader({
  title,
  subtitle,
  onLogout,
}: {
  title: string;
  subtitle?: string;
  onLogout: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} testID="dashboard-logout-button">
        <Ionicons name="log-out-outline" size={16} color={colors.brand} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

export function ProfileCard({ user }: { user: User }) {
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();
  return (
    <View style={styles.profile} testID="dashboard-profile-card">
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.profileName} numberOfLines={1}>
          {user.name || user.email}
        </Text>
        <Text style={styles.profileMeta} numberOfLines={1}>
          {user.email}
        </Text>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{user.role.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
}

export function StatCard({
  icon,
  label,
  value,
  testID,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string | number;
  testID?: string;
}) {
  return (
    <View style={styles.statCard} testID={testID}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color={colors.brand} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function QuickLinkRow({
  icon,
  label,
  hint,
  onPress,
  testID,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  hint?: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      style={styles.linkRow}
      activeOpacity={0.85}
      onPress={onPress}
      testID={testID}
    >
      <View style={styles.linkIcon}>
        <Ionicons name={icon} size={18} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.linkLabel}>{label}</Text>
        {hint ? <Text style={styles.linkHint}>{hint}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
}

export function LoadingBlock({ label }: { label?: string }) {
  return (
    <View style={{ padding: spacing.xl, alignItems: "center", gap: spacing.sm }}>
      <ActivityIndicator color={colors.brand} />
      {label ? <Text style={{ color: colors.muted, fontSize: font.sm }}>{label}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children, testID }: { children: React.ReactNode; testID?: string }) {
  return (
    <Text style={styles.sectionTitle} testID={testID}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  title: { fontSize: font.xxl, color: colors.onSurface, fontWeight: "500" },
  subtitle: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  logoutText: { color: colors.brand, fontWeight: "500", fontSize: font.sm },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: font.lg, fontWeight: "500" },
  profileName: { fontSize: font.lg, color: colors.onSurface, fontWeight: "500" },
  profileMeta: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  rolePill: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    backgroundColor: colors.brandTint,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  rolePillText: { color: colors.brand, fontSize: 10, fontWeight: "500", letterSpacing: 0.5 },
  statCard: {
    flex: 1,
    minWidth: "45%",
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statValue: { fontSize: font.xl, color: colors.onSurface, fontWeight: "500" },
  statLabel: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  linkRow: {
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
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  linkLabel: { fontSize: font.base, color: colors.onSurface, fontWeight: "500" },
  linkHint: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  sectionTitle: {
    fontSize: font.base,
    color: colors.onSurface,
    fontWeight: "500",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
