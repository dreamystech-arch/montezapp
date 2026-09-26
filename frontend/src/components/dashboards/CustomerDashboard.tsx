import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  fetchMyOrders,
  fetchMyProfile,
  fetchMyQuotes,
  fetchMyRFQs,
  fetchMySummary,
  fetchMyWishlist,
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
import { colors, spacing } from "@/src/theme";
import { WalletPage } from "@/src/components/dashboards/WalletPage";

type Page = "dashboard" | "profile" | "orders" | "quotes" | "wishlist" | "wallet";

const MENU: MenuItem<Page>[] = [
  { key: "dashboard", label: "Dashboard", icon: "speedometer-outline" },
  { key: "profile", label: "Profile", icon: "person-outline" },
  { key: "orders", label: "Orders", icon: "bag-handle-outline" },
  { key: "quotes", label: "Saved Quotes", icon: "bookmark-outline" },
  { key: "wishlist", label: "Wishlist", icon: "heart-outline" },
  { key: "wallet", label: "Wallet & Referrals", icon: "wallet-outline" },
];

export function CustomerDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [page, setPage] = useState<Page>("dashboard");

  return (
    <DashboardShell
      user={user}
      title="My Dashboard"
      menu={MENU}
      active={page}
      onSelect={setPage}
      onLogout={onLogout}
    >
      {page === "dashboard" ? <DashboardPage user={user} /> : null}
      {page === "profile" ? <ProfilePage user={user} /> : null}
      {page === "orders" ? <OrdersPage /> : null}
      {page === "quotes" ? <QuotesPage /> : null}
      {page === "wishlist" ? <WishlistPage /> : null}
      {page === "wallet" ? <WalletPage /> : null}
    </DashboardShell>
  );
}

// ---------- Pages ------------------------------------------------------------
function DashboardPage({ user }: { user: User }) {
  const summaryLoader = useCallback(() => fetchMySummary(), []);
  const rfqLoader = useCallback(() => fetchMyRFQs(), []);
  const summary = useAsyncData<any>(summaryLoader);
  const rfqs = useAsyncData<any[]>(rfqLoader);

  const refresh = () => {
    summary.refresh();
    rfqs.refresh();
  };

  const rfqCount = rfqs.state.status === "ready" ? rfqs.state.data.length : "—";
  const sum = summary.state.status === "ready" ? summary.state.data : null;
  const openCount =
    rfqs.state.status === "ready"
      ? rfqs.state.data.filter((r: any) => (r.status ?? "").toLowerCase() !== "closed").length
      : "—";

  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={summary.refreshing || rfqs.refreshing} testID="customer-page-dashboard">
      <ProfileCard user={user} />
      <SectionTitle>Overview</SectionTitle>
      <View style={styles.statGrid}>
        <StatCard icon="document-text-outline" label="Total RFQs" value={rfqCount as any} testID="customer-stat-rfqs" />
        <StatCard icon="time-outline" label="Open RFQs" value={openCount as any} testID="customer-stat-open" />
        <StatCard
          icon="bag-handle-outline"
          label="Orders"
          value={sum?.ordersCount ?? sum?.orders ?? "—"}
          testID="customer-stat-orders"
        />
        <StatCard
          icon="heart-outline"
          label="Saved"
          value={sum?.savedCount ?? sum?.saved ?? "—"}
          testID="customer-stat-saved"
        />
      </View>

      <SectionTitle>Recent RFQs</SectionTitle>
      {rfqs.state.status === "loading" ? (
        <LoadingBlock />
      ) : rfqs.state.status === "error" ? (
        <ErrorPanel error={rfqs.state.error} onRetry={rfqs.refresh} testID="customer-dashboard-rfq-error" />
      ) : rfqs.state.data.length === 0 ? (
        <EmptyPanel
          icon="document-text-outline"
          title="No RFQs yet"
          hint="Submit an RFQ from the RFQ tab to see it here."
          testID="customer-dashboard-rfq-empty"
        />
      ) : (
        rfqs.state.data.slice(0, 5).map((r: any) => (
          <GenericListCard
            key={r.id}
            title={(r.category ?? "General").replace(/-/g, " ")}
            subtitle={r.description}
            status={r.status}
            meta={[
              { label: "Qty", value: r.quantity },
              { label: "Date", value: new Date(r.createdAt).toLocaleDateString() },
            ]}
            testID={`customer-recent-rfq-${r.id}`}
          />
        ))
      )}
    </DashboardPageScroll>
  );
}

function ProfilePage({ user }: { user: User }) {
  const loader = useCallback(() => fetchMyProfile(), []);
  const { state, refresh, refreshing } = useAsyncData<any>(loader);
  const profile = state.status === "ready" ? state.data : null;
  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={refreshing} testID="customer-page-profile">
      <ProfileCard user={user} />
      <SectionTitle>Account details</SectionTitle>
      <InfoCard
        testID="customer-profile-info"
        rows={[
          { label: "Name", value: profile?.name ?? user.name ?? null },
          { label: "Email", value: profile?.email ?? user.email },
          { label: "Phone", value: profile?.phone ?? user.phone ?? null },
          { label: "Role", value: user.role },
          { label: "Company", value: profile?.company ?? profile?.companyName ?? null },
          { label: "Member since", value: profile?.createdAt ?? user.createdAt ?? null },
        ]}
      />
      {state.status === "loading" ? <LoadingBlock /> : null}
      {state.status === "error" ? <ErrorPanel error={state.error} onRetry={refresh} testID="customer-profile-error" /> : null}
    </DashboardPageScroll>
  );
}

function OrdersPage() {
  const loader = useCallback(() => fetchMyOrders(), []);
  const { state, refresh, refreshing } = useAsyncData<any[]>(loader);
  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={refreshing} testID="customer-page-orders">
      <SectionTitle>My Orders</SectionTitle>
      {state.status === "loading" ? (
        <LoadingBlock />
      ) : state.status === "error" ? (
        /Not found|404/i.test(state.error) ? (
          <ComingSoonPanel label="Orders module isn't live for your account yet." testID="customer-orders-comingsoon" />
        ) : (
          <ErrorPanel error={state.error} onRetry={refresh} testID="customer-orders-error" />
        )
      ) : state.data.length === 0 ? (
        <EmptyPanel icon="bag-handle-outline" title="No orders yet" hint="Approved RFQs become orders here." testID="customer-orders-empty" />
      ) : (
        state.data.map((o: any, i: number) => (
          <GenericListCard
            key={o.id ?? i}
            title={o.productName ?? o.title ?? o.name ?? `Order #${(o.id ?? "").slice?.(0, 8) ?? i + 1}`}
            subtitle={o.notes ?? o.description}
            status={o.status}
            meta={[
              o.quantity != null ? { label: "Qty", value: String(o.quantity) } : undefined,
              o.total != null ? { label: "Total", value: `₹${o.total}` } : undefined,
              o.createdAt ? { label: "Date", value: new Date(o.createdAt).toLocaleDateString() } : undefined,
            ].filter((m): m is { label: string; value: string } => !!m)}
            testID={`customer-order-${o.id ?? i}`}
          />
        ))
      )}
    </DashboardPageScroll>
  );
}

function QuotesPage() {
  // Primary source is /api/me/quotes. Falls back to /api/me/rfqs if the endpoint is unavailable.
  const loader = useCallback(async () => {
    try {
      return await fetchMyQuotes();
    } catch {
      return await fetchMyRFQs();
    }
  }, []);
  const { state, refresh, refreshing } = useAsyncData<any[]>(loader);
  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={refreshing} testID="customer-page-quotes">
      <SectionTitle>Saved Quotes / RFQs</SectionTitle>
      {state.status === "loading" ? (
        <LoadingBlock />
      ) : state.status === "error" ? (
        <ErrorPanel error={state.error} onRetry={refresh} testID="customer-quotes-error" />
      ) : state.data.length === 0 ? (
        <EmptyPanel
          icon="bookmark-outline"
          title="No saved quotes"
          hint="Quotes you receive from partners appear here."
          testID="customer-quotes-empty"
        />
      ) : (
        state.data.map((q: any, i: number) => (
          <GenericListCard
            key={q.id ?? i}
            title={q.product?.name ?? q.productName ?? (q.category ?? "Quote").replace?.(/-/g, " ") ?? "Quote"}
            subtitle={q.description ?? q.notes}
            status={q.status}
            meta={[
              q.quantity != null ? { label: "Qty", value: String(q.quantity) } : undefined,
              q.priceQuoted != null ? { label: "Price", value: `₹${q.priceQuoted}` } : undefined,
              q.createdAt ? { label: "Date", value: new Date(q.createdAt).toLocaleDateString() } : undefined,
            ].filter((m): m is { label: string; value: string } => !!m)}
            testID={`customer-quote-${q.id ?? i}`}
          />
        ))
      )}
    </DashboardPageScroll>
  );
}

function WishlistPage() {
  const loader = useCallback(() => fetchMyWishlist(), []);
  const { state, refresh, refreshing } = useAsyncData<any[]>(loader);
  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={refreshing} testID="customer-page-wishlist">
      <SectionTitle>Wishlist</SectionTitle>
      {state.status === "loading" ? (
        <LoadingBlock />
      ) : state.status === "error" ? (
        /Not found|404/i.test(state.error) ? (
          <ComingSoonPanel label="Wishlist isn't enabled for your account yet." testID="customer-wishlist-comingsoon" />
        ) : (
          <ErrorPanel error={state.error} onRetry={refresh} testID="customer-wishlist-error" />
        )
      ) : state.data.length === 0 ? (
        <EmptyPanel icon="heart-outline" title="Nothing saved yet" hint="Tap the heart on any product to add it here." testID="customer-wishlist-empty" />
      ) : (
        state.data.map((w: any, i: number) => (
          <GenericListCard
            key={w.id ?? w.productId ?? i}
            title={w.product?.name ?? w.name ?? w.productName ?? "Item"}
            subtitle={w.product?.description ?? w.description}
            meta={[
              w.product?.category ?? w.category ? { label: "Category", value: w.product?.category ?? w.category } : undefined,
              w.product?.price ?? w.price ? { label: "Price", value: `₹${w.product?.price ?? w.price}` } : undefined,
            ].filter((m): m is { label: string; value: string } => !!m)}
            testID={`customer-wishlist-${w.id ?? i}`}
          />
        ))
      )}
    </DashboardPageScroll>
  );
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
// Silence unused-import lint if any
void colors;
