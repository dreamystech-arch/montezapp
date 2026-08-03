import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchMyRFQs, fetchMySummary, fetchPartnerAnalytics, fetchPartnerOrders } from "@/src/api";
import type { RFQ, User } from "@/src/api/types";
import {
  DashboardHeader,
  LoadingBlock,
  ProfileCard,
  QuickLinkRow,
  SectionTitle,
  StatCard,
} from "@/src/components/dashboards/shared";
import { colors, font, radius, spacing } from "@/src/theme";

export function PartnerDashboard({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [orderRes, anaRes, sumRes, rfqRes] = await Promise.allSettled([
        fetchPartnerOrders(),
        fetchPartnerAnalytics(),
        fetchMySummary(),
        fetchMyRFQs(),
      ]);
      if (orderRes.status === "fulfilled") setOrders(orderRes.value);
      if (anaRes.status === "fulfilled") setAnalytics(anaRes.value);
      if (sumRes.status === "fulfilled") setSummary(sumRes.value);
      if (rfqRes.status === "fulfilled") setRfqs(rfqRes.value);
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

  const ordersCount = orders.length;
  const activeCount = orders.filter((o: any) => (o.status ?? "").toLowerCase() !== "completed").length;
  const rfqsCount = rfqs.length;
  const revenue = analytics?.totalRevenue ?? analytics?.revenue ?? summary?.revenue;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      testID="partner-dashboard"
    >
      <DashboardHeader title="Partner Dashboard" subtitle="Manage your orders & RFQs" onLogout={onLogout} />
      <ProfileCard user={user} />

      <SectionTitle>Overview</SectionTitle>
      <View style={styles.statGrid}>
        <StatCard icon="cube-outline" label="Assigned Orders" value={ordersCount} testID="partner-stat-orders" />
        <StatCard icon="time-outline" label="Active" value={activeCount} testID="partner-stat-active" />
        <StatCard icon="document-text-outline" label="My RFQs" value={rfqsCount} testID="partner-stat-rfqs" />
        <StatCard
          icon="cash-outline"
          label="Revenue"
          value={revenue != null ? `₹${revenue}` : "—"}
          testID="partner-stat-revenue"
        />
      </View>

      <SectionTitle testID="partner-orders-title">Assigned Products / Orders</SectionTitle>
      {loading ? (
        <LoadingBlock label="Loading orders…" />
      ) : orders.length === 0 ? (
        <View style={styles.emptyCard} testID="partner-orders-empty">
          <Text style={styles.emptyText}>No orders assigned to your account yet.</Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: spacing.lg }}>
          {orders.slice(0, 20).map((o: any, i: number) => (
            <View key={o.id ?? i} style={styles.itemCard} testID={`partner-order-${o.id ?? i}`}>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {o.productName ?? o.name ?? o.title ?? `Order #${(o.id ?? "").slice?.(0, 8) ?? i + 1}`}
              </Text>
              <View style={styles.itemMetaRow}>
                {o.quantity != null ? (
                  <MetaChip label="Qty" value={String(o.quantity)} />
                ) : null}
                {o.status ? <MetaChip label="Status" value={o.status} /> : null}
                {o.customer ? (
                  <MetaChip label="Customer" value={typeof o.customer === "string" ? o.customer : o.customer?.email ?? "—"} />
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      <SectionTitle testID="partner-rfqs-title">My RFQs</SectionTitle>
      {loading ? (
        <LoadingBlock />
      ) : rfqs.length === 0 ? (
        <View style={styles.emptyCard} testID="partner-rfqs-empty">
          <Text style={styles.emptyText}>You haven&apos;t submitted or received any RFQs yet.</Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: spacing.lg }}>
          {rfqs.slice(0, 10).map((r) => (
            <View key={r.id} style={styles.itemCard} testID={`partner-rfq-${r.id}`}>
              <Text style={styles.itemTitle}>{(r.category ?? "General").replace(/-/g, " ")}</Text>
              <View style={styles.itemMetaRow}>
                <MetaChip label="Qty" value={r.quantity} />
                <MetaChip label="Status" value={r.status} />
              </View>
              <Text style={styles.itemDesc} numberOfLines={2}>
                {r.description}
              </Text>
            </View>
          ))}
        </View>
      )}

      <SectionTitle>Account</SectionTitle>
      <View style={styles.card}>
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Role" value={user.role} />
        {user.name ? <InfoRow label="Name" value={user.name} /> : null}
        {user.phone ? <InfoRow label="Phone" value={user.phone} /> : null}
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
        <QuickLinkRow icon="log-out-outline" label="Logout" onPress={onLogout} testID="partner-logout-row" />
      </View>
    </ScrollView>
  );
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

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}:</Text>
      <Text style={styles.chipValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
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
  itemCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    gap: 6,
  },
  itemTitle: { color: colors.onSurface, fontSize: font.base, fontWeight: "500", textTransform: "capitalize" },
  itemDesc: { color: colors.onSurfaceSecondary, fontSize: font.sm, lineHeight: 20 },
  itemMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: 2 },
  chip: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTint,
    alignItems: "center",
  },
  chipLabel: { color: colors.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  chipValue: { color: colors.brand, fontSize: font.sm, fontWeight: "500", textTransform: "capitalize" },
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
    textTransform: "capitalize",
  },
});
