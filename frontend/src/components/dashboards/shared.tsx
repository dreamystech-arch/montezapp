import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, font, radius, shadow, spacing } from "@/src/theme";
import type { User } from "@/src/api/types";

// ---------------------------------------------------------------------------
// Dashboard shell — menu + page renderer
// ---------------------------------------------------------------------------
export type MenuItem<Key extends string = string> = {
  key: Key;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
};

export function DashboardShell<Key extends string>({
  user,
  title,
  menu,
  active,
  onSelect,
  onLogout,
  children,
}: {
  user: User;
  title: string;
  menu: MenuItem<Key>[];
  active: Key;
  onSelect: (k: Key) => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }} testID={`${user.role}-dashboard`}>
      {/* Top header */}
      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {user.email} • {user.role.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} testID="dashboard-logout-button">
          <Ionicons name="log-out-outline" size={16} color={colors.brand} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Menu chip row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.menuRow}
        style={styles.menuScroll}
        testID={`${user.role}-menu-row`}
      >
        {menu.map((m) => {
          const isActive = m.key === active;
          return (
            <TouchableOpacity
              key={m.key}
              onPress={() => onSelect(m.key)}
              style={[styles.chip, isActive && styles.chipActive]}
              activeOpacity={0.85}
              testID={`menu-${user.role}-${m.key}`}
            >
              <Ionicons name={m.icon} size={14} color={isActive ? "#FFFFFF" : colors.onSurfaceSecondary} />
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Page container */}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Reusable primitives
// ---------------------------------------------------------------------------
export function DashboardPageScroll({
  children,
  onRefresh,
  refreshing,
  testID,
}: {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  testID?: string;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingVertical: spacing.md, paddingBottom: spacing.xxxl }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        ) : undefined
      }
      testID={testID}
    >
      {children}
    </ScrollView>
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
    <TouchableOpacity style={styles.linkRow} activeOpacity={0.85} onPress={onPress} testID={testID}>
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
    <View style={{ padding: spacing.xxl, alignItems: "center", gap: spacing.sm }}>
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

export function InfoCard({
  rows,
  testID,
}: {
  rows: { label: string; value?: string | number | null }[];
  testID?: string;
}) {
  return (
    <View style={styles.card} testID={testID}>
      {rows
        .filter((r) => r.value != null && r.value !== "")
        .map((r) => (
          <View key={r.label} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{r.label}</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {String(r.value)}
            </Text>
          </View>
        ))}
    </View>
  );
}

export function EmptyPanel({
  icon = "cube-outline",
  title,
  hint,
  testID,
}: {
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  hint?: string;
  testID?: string;
}) {
  return (
    <View style={styles.empty} testID={testID}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={26} color={colors.brand} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

export function ComingSoonPanel({ label, testID }: { label: string; testID?: string }) {
  return (
    <View style={styles.empty} testID={testID}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="hourglass-outline" size={26} color={colors.brand} />
      </View>
      <Text style={styles.emptyTitle}>Coming soon</Text>
      <Text style={styles.emptyHint}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Generic list card — used by orders/quotes/wishlist/payments/inventory
// ---------------------------------------------------------------------------
export function GenericListCard({
  title,
  subtitle,
  status,
  meta,
  testID,
}: {
  title: string;
  subtitle?: string;
  status?: string;
  meta?: { label: string; value: string }[];
  testID?: string;
}) {
  return (
    <View style={styles.listCard} testID={testID}>
      <View style={styles.listTop}>
        <Text style={styles.listTitle} numberOfLines={2}>
          {title}
        </Text>
        {status ? (
          <View style={[styles.status, statusStyle(status)]}>
            <Text style={[styles.statusText, statusStyle(status)]} numberOfLines={1}>
              {status}
            </Text>
          </View>
        ) : null}
      </View>
      {subtitle ? (
        <Text style={styles.listSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
      {meta && meta.length > 0 ? (
        <View style={styles.metaRow}>
          {meta.map((m) => (
            <View key={m.label} style={styles.metaChip}>
              <Text style={styles.metaLabel}>{m.label}:</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {m.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function statusStyle(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "new" || s === "pending") return { backgroundColor: "#FEF3C7", color: "#B45309" } as const;
  if (s.includes("progress") || s === "processing") return { backgroundColor: "#DBEAFE", color: "#1D4ED8" } as const;
  if (s === "closed" || s === "completed" || s === "paid") return { backgroundColor: "#DCFCE7", color: "#166534" } as const;
  if (s === "cancelled" || s === "rejected" || s === "failed") return { backgroundColor: "#FEE2E2", color: "#B91C1C" } as const;
  return { backgroundColor: colors.surfaceTertiary, color: colors.onSurfaceSecondary } as const;
}

// ---------------------------------------------------------------------------
// Generic async page hook — handles loading / error / empty states + retry.
// ---------------------------------------------------------------------------
export type PageState<T> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; data: T };

export function useAsyncData<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<PageState<T>>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await loader();
      setState({ status: "ready", data });
    } catch (e: any) {
      setState({ status: "error", error: e?.message ?? "Failed to load" });
    } finally {
      setRefreshing(false);
    }
  }, [loader]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return { state, refresh, refreshing };
}

export function ErrorPanel({ error, onRetry, testID }: { error: string; onRetry: () => void; testID?: string }) {
  const missing = /404|Not found/i.test(error);
  return (
    <View style={styles.empty} testID={testID}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={missing ? "hourglass-outline" : "cloud-offline-outline"} size={26} color={colors.brand} />
      </View>
      <Text style={styles.emptyTitle}>{missing ? "Coming soon" : "Couldn't load"}</Text>
      <Text style={styles.emptyHint}>{error}</Text>
      {!missing ? (
        <TouchableOpacity onPress={onRetry} style={styles.retry} testID="dashboard-retry-button">
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { color: "#FFFFFF", fontSize: font.base, fontWeight: "500" },
  headerTitle: { fontSize: font.lg, color: colors.onSurface, fontWeight: "500" },
  headerSubtitle: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
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
  menuScroll: { flexGrow: 0 },
  menuRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: font.sm, color: colors.onSurfaceSecondary, fontWeight: "500" },
  chipTextActive: { color: "#FFFFFF" },
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
  card: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  infoLabel: { color: colors.muted, fontSize: font.sm },
  infoValue: {
    color: colors.onSurface,
    fontSize: font.base,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  empty: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: { color: colors.onSurface, fontSize: font.base, fontWeight: "500", marginBottom: 4 },
  emptyHint: { color: colors.muted, fontSize: font.sm, textAlign: "center" },
  listCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
    gap: 6,
  },
  listTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  listTitle: { color: colors.onSurface, fontSize: font.base, fontWeight: "500", flex: 1, textTransform: "capitalize" },
  listSubtitle: { color: colors.onSurfaceSecondary, fontSize: font.sm, lineHeight: 20 },
  status: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: 2 },
  metaChip: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTint,
    alignItems: "center",
  },
  metaLabel: { color: colors.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { color: colors.brand, fontSize: font.sm, fontWeight: "500", textTransform: "capitalize" },
  retry: {
    marginTop: spacing.md,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  retryText: { color: "#FFFFFF", fontWeight: "500" },
});

// Keep old header component for back-compat (unused after refactor but harmless).
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
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} testID="dashboard-logout-button">
        <Ionicons name="log-out-outline" size={16} color={colors.brand} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
