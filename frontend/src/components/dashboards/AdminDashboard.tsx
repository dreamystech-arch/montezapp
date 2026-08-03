import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchAdminPartners, fetchAdminRFQs, fetchAdminUsers, fetchProducts } from "@/src/api";
import type { User } from "@/src/api/types";
import {
  DashboardHeader,
  LoadingBlock,
  ProfileCard,
  QuickLinkRow,
  SectionTitle,
  StatCard,
} from "@/src/components/dashboards/shared";
import { colors, font, spacing } from "@/src/theme";

type Stats = {
  products: number | null;
  customers: number | null;
  partners: number | null;
  rfqs: number | null;
};

export function AdminDashboard({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [stats, setStats] = useState<Stats>({ products: null, customers: null, partners: null, rfqs: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const load = useCallback(async () => {
    const errs: string[] = [];
    const [prodRes, usersRes, partnerRes, rfqRes] = await Promise.allSettled([
      fetchProducts(),
      fetchAdminUsers(),
      fetchAdminPartners(),
      fetchAdminRFQs(),
    ]);
    const next: Stats = { products: null, customers: null, partners: null, rfqs: null };
    if (prodRes.status === "fulfilled") next.products = prodRes.value.length;
    else errs.push("products");
    if (usersRes.status === "fulfilled") {
      // Customers = users with role customer (best-effort — some payloads may already be filtered).
      const users = usersRes.value as any[];
      const custs = users.filter((u) => (u?.role ?? "customer") === "customer");
      next.customers = custs.length || users.length;
    } else errs.push("customers");
    if (partnerRes.status === "fulfilled") next.partners = (partnerRes.value as any[]).length;
    else errs.push("partners");
    if (rfqRes.status === "fulfilled") next.rfqs = (rfqRes.value as any[]).length;
    else errs.push("rfqs");
    setStats(next);
    setErrors(errs);
    setLoading(false);
    setRefreshing(false);
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
      testID="admin-dashboard"
    >
      <DashboardHeader
        title="Admin Dashboard"
        subtitle="Platform overview & controls"
        onLogout={onLogout}
      />
      <ProfileCard user={user} />

      <SectionTitle>Summary stats</SectionTitle>
      {loading ? (
        <LoadingBlock label="Fetching platform stats…" />
      ) : (
        <View style={styles.statGrid}>
          <StatCard icon="cube-outline" label="Total Products" value={fmt(stats.products)} testID="admin-stat-products" />
          <StatCard icon="people-outline" label="Customers" value={fmt(stats.customers)} testID="admin-stat-customers" />
          <StatCard icon="business-outline" label="Partners" value={fmt(stats.partners)} testID="admin-stat-partners" />
          <StatCard icon="document-text-outline" label="RFQs" value={fmt(stats.rfqs)} testID="admin-stat-rfqs" />
        </View>
      )}

      {errors.length > 0 ? (
        <Text style={styles.errorNote}>
          Couldn&apos;t load: {errors.join(", ")}. Pull to retry.
        </Text>
      ) : null}

      <SectionTitle>Quick links</SectionTitle>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <QuickLinkRow
          icon="cube-outline"
          label="Manage Products"
          hint={fmt(stats.products) + " total"}
          testID="admin-link-products"
        />
        <QuickLinkRow
          icon="business-outline"
          label="Manage Partners"
          hint={fmt(stats.partners) + " total"}
          testID="admin-link-partners"
        />
        <QuickLinkRow
          icon="people-outline"
          label="Manage Customers"
          hint={fmt(stats.customers) + " total"}
          testID="admin-link-customers"
        />
        <QuickLinkRow
          icon="document-text-outline"
          label="Review RFQs"
          hint={fmt(stats.rfqs) + " total"}
          testID="admin-link-rfqs"
        />
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
        <QuickLinkRow icon="log-out-outline" label="Logout" onPress={onLogout} testID="admin-logout-row" />
      </View>
    </ScrollView>
  );
}

function fmt(n: number | null) {
  return n == null ? "—" : String(n);
}

const styles = StyleSheet.create({
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  errorNote: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    color: colors.warning,
    fontSize: font.sm,
  },
});
