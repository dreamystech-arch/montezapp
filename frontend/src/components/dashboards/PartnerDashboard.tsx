import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  fetchMyProfile,
  fetchMyRFQs,
  fetchMySummary,
  fetchPartnerAnalytics,
  fetchPartnerInventory,
  fetchPartnerOrders,
  fetchPartnerPayments,
} from "@/src/api";
import type { User } from "@/src/api/types";
import {
  ComingSoonPanel,
  DashboardPageScroll,
  DashboardShell,
  EmptyPanel,
  ErrorPanel,
  GenericListCard,
  InfoCard,
  LoadingBlock,
  MenuItem,
  ProfileCard,
  SectionTitle,
  StatCard,
  useAsyncData,
} from "@/src/components/dashboards/shared";
import { spacing } from "@/src/theme";

type Page = "dashboard" | "profile" | "orders" | "payments" | "inventory" | "analytics";

const MENU: MenuItem<Page>[] = [
  { key: "dashboard", label: "Dashboard", icon: "speedometer-outline" },
  { key: "profile", label: "Profile", icon: "person-outline" },
  { key: "orders", label: "Purchase Orders", icon: "receipt-outline" },
  { key: "payments", label: "Payment History", icon: "cash-outline" },
  { key: "inventory", label: "Inventory", icon: "cube-outline" },
  { key: "analytics", label: "Analytics", icon: "stats-chart-outline" },
];

export function PartnerDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [page, setPage] = useState<Page>("dashboard");

  return (
    <DashboardShell
      user={user}
      title="Partner Dashboard"
      menu={MENU}
      active={page}
      onSelect={setPage}
      onLogout={onLogout}
    >
      {page === "dashboard" ? <DashboardPage user={user} /> : null}
      {page === "profile" ? <ProfilePage user={user} /> : null}
      {page === "orders" ? <OrdersPage /> : null}
      {page === "payments" ? <PaymentsPage /> : null}
      {page === "inventory" ? <InventoryPage /> : null}
      {page === "analytics" ? <AnalyticsPage /> : null}
    </DashboardShell>
  );
}

function DashboardPage({ user }: { user: User }) {
  const analyticsLoader = useCallback(() => fetchPartnerAnalytics(), []);
  const ordersLoader = useCallback(() => fetchPartnerOrders(), []);
  const summaryLoader = useCallback(() => fetchMySummary(), []);
  const analytics = useAsyncData<any>(analyticsLoader);
  const orders = useAsyncData<any[]>(ordersLoader);
  const summary = useAsyncData<any>(summaryLoader);

  const refresh = () => {
    analytics.refresh();
    orders.refresh();
    summary.refresh();
  };

  const ordersCount = orders.state.status === "ready" ? orders.state.data.length : "—";
  const active =
    orders.state.status === "ready"
      ? orders.state.data.filter((o: any) => (o.status ?? "").toLowerCase() !== "completed").length
      : "—";
  const revenue =
    (analytics.state.status === "ready" &&
      (analytics.state.data?.totalRevenue ??
        analytics.state.data?.revenue ??
        summary.state.status === "ready" ? summary.state.data?.revenue : undefined)) ||
    "—";
  const rating =
    analytics.state.status === "ready"
      ? analytics.state.data?.rating ?? analytics.state.data?.avgRating ?? "—"
      : "—";

  return (
    <DashboardPageScroll
      onRefresh={refresh}
      refreshing={analytics.refreshing || orders.refreshing || summary.refreshing}
      testID="partner-page-dashboard"
    >
      <ProfileCard user={user} />
      <SectionTitle>Overview</SectionTitle>
      <View style={styles.statGrid}>
        <StatCard icon="receipt-outline" label="Purchase Orders" value={ordersCount as any} testID="partner-stat-orders" />
        <StatCard icon="time-outline" label="Active" value={active as any} testID="partner-stat-active" />
        <StatCard icon="cash-outline" label="Revenue" value={revenue === "—" ? "—" : `₹${revenue}`} testID="partner-stat-revenue" />
        <StatCard icon="star-outline" label="Rating" value={rating as any} testID="partner-stat-rating" />
      </View>

      <SectionTitle>Recent orders</SectionTitle>
      {orders.state.status === "loading" ? (
        <LoadingBlock />
      ) : orders.state.status === "error" ? (
        <ErrorPanel error={orders.state.error} onRetry={orders.refresh} testID="partner-dashboard-orders-error" />
      ) : orders.state.data.length === 0 ? (
        <EmptyPanel icon="receipt-outline" title="No purchase orders yet" hint="Approved RFQs become POs and appear here." testID="partner-dashboard-orders-empty" />
      ) : (
        orders.state.data.slice(0, 5).map((o: any, i: number) => (
          <GenericListCard
            key={o.id ?? i}
            title={o.productName ?? o.title ?? o.name ?? `Order #${(o.id ?? "").slice?.(0, 8) ?? i + 1}`}
            subtitle={o.notes ?? o.description}
            status={o.status}
            meta={[
              o.quantity != null ? { label: "Qty", value: String(o.quantity) } : undefined,
              o.total != null ? { label: "Total", value: `₹${o.total}` } : undefined,
            ].filter((m): m is { label: string; value: string } => !!m)}
            testID={`partner-dashboard-order-${o.id ?? i}`}
          />
        ))
      )}
    </DashboardPageScroll>
  );
}

function ProfilePage({ user }: { user: User }) {
  const loader = useCallback(() => fetchMyProfile(), []);
  const { state, refresh, refreshing } = useAsyncData<any>(loader);
  const p = state.status === "ready" ? state.data : null;

  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={refreshing} testID="partner-page-profile">
      <ProfileCard user={user} />
      <SectionTitle>Business details</SectionTitle>
      <InfoCard
        testID="partner-profile-info"
        rows={[
          { label: "Name", value: p?.name ?? user.name ?? null },
          { label: "Email", value: p?.email ?? user.email },
          { label: "Phone", value: p?.phone ?? user.phone ?? null },
          { label: "Company", value: p?.companyName ?? p?.company ?? null },
          { label: "GSTIN", value: p?.gstin ?? null },
          { label: "Factory", value: p?.factory?.name ?? p?.factoryName ?? null },
          { label: "City", value: p?.city ?? p?.address?.city ?? null },
          { label: "Verification", value: p?.verificationStatus ?? p?.verified === true ? "Verified" : (p?.verified === false ? "Pending" : null) },
        ]}
      />
      {state.status === "loading" ? <LoadingBlock /> : null}
      {state.status === "error" ? <ErrorPanel error={state.error} onRetry={refresh} testID="partner-profile-error" /> : null}
      <SectionTitle>My RFQs</SectionTitle>
      <PartnerRfqsInline />
    </DashboardPageScroll>
  );
}

function PartnerRfqsInline() {
  const loader = useCallback(() => fetchMyRFQs(), []);
  const { state, refresh } = useAsyncData<any[]>(loader);
  if (state.status === "loading") return <LoadingBlock />;
  if (state.status === "error")
    return <ErrorPanel error={state.error} onRetry={refresh} testID="partner-profile-rfqs-error" />;
  if (state.data.length === 0)
    return <EmptyPanel icon="document-text-outline" title="No RFQs" hint="You haven't received or submitted any RFQs." testID="partner-profile-rfqs-empty" />;
  return (
    <>
      {state.data.slice(0, 10).map((r: any) => (
        <GenericListCard
          key={r.id}
          title={(r.category ?? "General").replace(/-/g, " ")}
          subtitle={r.description}
          status={r.status}
          meta={[
            { label: "Qty", value: r.quantity },
            r.createdAt ? { label: "Date", value: new Date(r.createdAt).toLocaleDateString() } : undefined,
          ].filter((m): m is { label: string; value: string } => !!m)}
          testID={`partner-profile-rfq-${r.id}`}
        />
      ))}
    </>
  );
}

function OrdersPage() {
  const loader = useCallback(() => fetchPartnerOrders(), []);
  const { state, refresh, refreshing } = useAsyncData<any[]>(loader);
  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={refreshing} testID="partner-page-orders">
      <SectionTitle>Purchase Orders</SectionTitle>
      {state.status === "loading" ? (
        <LoadingBlock />
      ) : state.status === "error" ? (
        <ErrorPanel error={state.error} onRetry={refresh} testID="partner-orders-error" />
      ) : state.data.length === 0 ? (
        <EmptyPanel icon="receipt-outline" title="No purchase orders" hint="POs from approved RFQs will appear here." testID="partner-orders-empty" />
      ) : (
        state.data.map((o: any, i: number) => (
          <GenericListCard
            key={o.id ?? i}
            title={o.productName ?? o.title ?? o.name ?? `PO #${(o.id ?? "").slice?.(0, 8) ?? i + 1}`}
            subtitle={o.notes ?? o.description}
            status={o.status}
            meta={[
              o.quantity != null ? { label: "Qty", value: String(o.quantity) } : undefined,
              o.total != null ? { label: "Total", value: `₹${o.total}` } : undefined,
              o.customer?.email ? { label: "Customer", value: o.customer.email } : undefined,
              o.createdAt ? { label: "Date", value: new Date(o.createdAt).toLocaleDateString() } : undefined,
            ].filter((m): m is { label: string; value: string } => !!m)}
            testID={`partner-order-${o.id ?? i}`}
          />
        ))
      )}
    </DashboardPageScroll>
  );
}

function PaymentsPage() {
  const loader = useCallback(() => fetchPartnerPayments(), []);
  const { state, refresh, refreshing } = useAsyncData<any[]>(loader);
  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={refreshing} testID="partner-page-payments">
      <SectionTitle>Payment History</SectionTitle>
      {state.status === "loading" ? (
        <LoadingBlock />
      ) : state.status === "error" ? (
        /Not found|404/i.test(state.error) ? (
          <ComingSoonPanel label="Payments module isn't live yet." testID="partner-payments-comingsoon" />
        ) : (
          <ErrorPanel error={state.error} onRetry={refresh} testID="partner-payments-error" />
        )
      ) : state.data.length === 0 ? (
        <EmptyPanel icon="cash-outline" title="No payments yet" hint="Received payouts will show up here." testID="partner-payments-empty" />
      ) : (
        state.data.map((p: any, i: number) => (
          <GenericListCard
            key={p.id ?? i}
            title={p.reference ?? `Payment #${(p.id ?? "").slice?.(0, 8) ?? i + 1}`}
            subtitle={p.notes ?? p.description}
            status={p.status}
            meta={[
              p.amount != null ? { label: "Amount", value: `₹${p.amount}` } : undefined,
              p.method ? { label: "Method", value: p.method } : undefined,
              p.createdAt ? { label: "Date", value: new Date(p.createdAt).toLocaleDateString() } : undefined,
            ].filter((m): m is { label: string; value: string } => !!m)}
            testID={`partner-payment-${p.id ?? i}`}
          />
        ))
      )}
    </DashboardPageScroll>
  );
}

function InventoryPage() {
  const loader = useCallback(() => fetchPartnerInventory(), []);
  const { state, refresh, refreshing } = useAsyncData<any[]>(loader);
  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={refreshing} testID="partner-page-inventory">
      <SectionTitle>Inventory</SectionTitle>
      {state.status === "loading" ? (
        <LoadingBlock />
      ) : state.status === "error" ? (
        /Not found|404/i.test(state.error) ? (
          <ComingSoonPanel label="Inventory module isn't live yet." testID="partner-inventory-comingsoon" />
        ) : (
          <ErrorPanel error={state.error} onRetry={refresh} testID="partner-inventory-error" />
        )
      ) : state.data.length === 0 ? (
        <EmptyPanel icon="cube-outline" title="No inventory items" hint="Your product stock levels appear here." testID="partner-inventory-empty" />
      ) : (
        state.data.map((it: any, i: number) => (
          <GenericListCard
            key={it.id ?? it.sku ?? i}
            title={it.productName ?? it.name ?? it.title ?? `SKU ${it.sku ?? i + 1}`}
            subtitle={it.notes ?? it.description}
            status={it.status}
            meta={[
              it.stock != null ? { label: "Stock", value: String(it.stock) } : undefined,
              it.sku ? { label: "SKU", value: it.sku } : undefined,
              it.warehouse ? { label: "Warehouse", value: it.warehouse } : undefined,
            ].filter((m): m is { label: string; value: string } => !!m)}
            testID={`partner-inventory-${it.id ?? i}`}
          />
        ))
      )}
    </DashboardPageScroll>
  );
}

function AnalyticsPage() {
  const loader = useCallback(() => fetchPartnerAnalytics(), []);
  const { state, refresh, refreshing } = useAsyncData<any>(loader);
  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={refreshing} testID="partner-page-analytics">
      <SectionTitle>Analytics</SectionTitle>
      {state.status === "loading" ? (
        <LoadingBlock />
      ) : state.status === "error" ? (
        <ErrorPanel error={state.error} onRetry={refresh} testID="partner-analytics-error" />
      ) : (
        <>
          <View style={styles.statGrid}>
            <StatCard
              icon="cash-outline"
              label="Total Revenue"
              value={state.data?.totalRevenue != null || state.data?.revenue != null
                ? `₹${state.data.totalRevenue ?? state.data.revenue}`
                : "—"}
              testID="partner-analytics-revenue"
            />
            <StatCard icon="cube-outline" label="Orders" value={state.data?.ordersCount ?? state.data?.orders ?? "—"} testID="partner-analytics-orders" />
            <StatCard icon="star-outline" label="Avg Rating" value={state.data?.avgRating ?? state.data?.rating ?? "—"} testID="partner-analytics-rating" />
            <StatCard
              icon="trending-up-outline"
              label="This Month"
              value={
                state.data?.thisMonthRevenue != null
                  ? `₹${state.data.thisMonthRevenue}`
                  : state.data?.currentMonth ?? "—"
              }
              testID="partner-analytics-month"
            />
          </View>
          <SectionTitle>Details</SectionTitle>
          <InfoCard
            testID="partner-analytics-details"
            rows={Object.entries(state.data ?? {})
              .filter(([, v]) => typeof v !== "object" || v == null)
              .map(([k, v]) => ({ label: humaniseKey(k), value: String(v ?? "") }))}
          />
        </>
      )}
    </DashboardPageScroll>
  );
}

function humaniseKey(k: string) {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

const styles = StyleSheet.create({
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
});
