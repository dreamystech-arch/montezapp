import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchMyRFQs, fetchMySummary } from "@/src/api";
import type { RFQ, User } from "@/src/api/types";
import {
  DashboardHeader,
  LoadingBlock,
  ProfileCard,
  QuickLinkRow,
  SectionTitle,
} from "@/src/components/dashboards/shared";
import { colors, font, radius, spacing } from "@/src/theme";

export function CustomerDashboard({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [rfqRes, sumRes] = await Promise.allSettled([fetchMyRFQs(), fetchMySummary()]);
      if (rfqRes.status === "fulfilled") setRfqs(rfqRes.value);
      if (sumRes.status === "fulfilled") setSummary(sumRes.value);
      if (rfqRes.status === "rejected" && sumRes.status === "rejected") {
        setError("Could not load your data. Pull to retry.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      testID="customer-dashboard"
    >
      <DashboardHeader title="My Dashboard" subtitle="Track your quotes and account" onLogout={onLogout} />
      <ProfileCard user={user} />

      <SectionTitle>Profile</SectionTitle>
      <View style={styles.card} testID="customer-profile-details">
        <InfoRow label="Email" value={user.email} />
        {user.name ? <InfoRow label="Name" value={user.name} /> : null}
        {user.phone ? <InfoRow label="Phone" value={user.phone} /> : null}
        <InfoRow label="Role" value={user.role} />
        {user.createdAt ? (
          <InfoRow label="Member since" value={new Date(user.createdAt).toLocaleDateString()} />
        ) : null}
      </View>

      <SectionTitle testID="customer-rfq-history-title">RFQ history</SectionTitle>
      {loading ? (
        <LoadingBlock label="Loading your quotes…" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : rfqs.length === 0 ? (
        <View style={styles.emptyCard} testID="customer-rfq-empty">
          <Text style={styles.emptyText}>You haven&apos;t submitted any RFQs yet.</Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: spacing.lg }}>
          {rfqs.slice(0, 20).map((r) => (
            <View key={r.id} style={styles.rfqCard} testID={`customer-rfq-${r.id}`}>
              <View style={styles.rfqTop}>
                <Text style={styles.rfqCategory} numberOfLines={1}>
                  {(r.category ?? "General").replace(/-/g, " ")}
                </Text>
                <View style={[styles.status, statusStyle(r.status)]}>
                  <Text style={[styles.statusText, statusStyle(r.status)]} numberOfLines={1}>
                    {r.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.rfqQuantity}>{r.quantity}</Text>
              <Text style={styles.rfqDesc} numberOfLines={2}>
                {r.description}
              </Text>
              <Text style={styles.rfqDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
            </View>
          ))}
        </View>
      )}

      {summary ? (
        <>
          <SectionTitle>Summary</SectionTitle>
          <View style={styles.card}>
            {Object.entries(summary).slice(0, 6).map(([k, v]) => (
              <InfoRow key={k} label={humaniseKey(k)} value={String(typeof v === "object" ? JSON.stringify(v) : v)} />
            ))}
          </View>
        </>
      ) : null}

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
        <QuickLinkRow icon="log-out-outline" label="Logout" onPress={onLogout} testID="customer-logout-row" />
      </View>
    </ScrollView>
  );
}

function humaniseKey(k: string) {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function statusStyle(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "new") return { backgroundColor: "#FEF3C7", color: "#B45309" } as const;
  if (s === "in-progress" || s === "in_progress") return { backgroundColor: "#DBEAFE", color: "#1D4ED8" } as const;
  if (s === "closed" || s === "completed") return { backgroundColor: "#DCFCE7", color: "#166534" } as const;
  return { backgroundColor: colors.surfaceTertiary, color: colors.onSurfaceSecondary } as const;
}

const styles = StyleSheet.create({
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
  emptyCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
  },
  emptyText: { color: colors.muted, fontSize: font.base },
  rfqCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    gap: 4,
  },
  rfqTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rfqCategory: {
    color: colors.onSurface,
    fontSize: font.base,
    fontWeight: "500",
    textTransform: "capitalize",
    flex: 1,
  },
  status: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusText: { fontSize: 10, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase" },
  rfqQuantity: { color: colors.brand, fontSize: font.base, fontWeight: "500" },
  rfqDesc: { color: colors.onSurfaceSecondary, fontSize: font.sm, lineHeight: 20 },
  rfqDate: { color: colors.muted, fontSize: font.sm, marginTop: 2 },
  errorText: {
    color: colors.error,
    fontSize: font.sm,
    paddingHorizontal: spacing.lg,
  },
});
