import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  fetchAdminHomeCategories,
  fetchAdminOrders,
  fetchAdminPartners,
  fetchAdminProducts,
  fetchAdminRFQs,
  fetchAdminUsers,
  saveAdminHomeCategories,
} from "@/src/api";
import type { AdminHomeCategoryRow } from "@/src/api";
import type { User } from "@/src/api/types";
import {
  DashboardPageScroll,
  DashboardShell,
  EmptyPanel,
  ErrorPanel,
  GenericListCard,
  LoadingBlock,
  MenuItem,
  ProfileCard,
  SectionTitle,
  StatCard,
  useAsyncData,
} from "@/src/components/dashboards/shared";
import { colors, font, radius, spacing } from "@/src/theme";

type Page = "dashboard" | "products" | "partners" | "customers" | "rfqs" | "orders" | "categories";

const MENU: MenuItem<Page>[] = [
  { key: "dashboard", label: "Dashboard", icon: "speedometer-outline" },
  { key: "products", label: "Manage Products", icon: "cube-outline" },
  { key: "partners", label: "Manage Partners", icon: "business-outline" },
  { key: "customers", label: "Manage Customers", icon: "people-outline" },
  { key: "rfqs", label: "Manage RFQs", icon: "document-text-outline" },
  { key: "orders", label: "Manage Orders", icon: "bag-handle-outline" },
  { key: "categories", label: "Homepage Categories", icon: "layers-outline" },
];

export function AdminDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [page, setPage] = useState<Page>("dashboard");
  return (
    <DashboardShell
      user={user}
      title="Admin Dashboard"
      menu={MENU}
      active={page}
      onSelect={setPage}
      onLogout={onLogout}
    >
      {page === "dashboard" ? <DashboardPage user={user} /> : null}
      {page === "products" ? <ProductsPage /> : null}
      {page === "partners" ? <PartnersPage /> : null}
      {page === "customers" ? <CustomersPage /> : null}
      {page === "rfqs" ? <RFQsPage /> : null}
      {page === "orders" ? <OrdersPage /> : null}
      {page === "categories" ? <CategoriesPage /> : null}
    </DashboardShell>
  );
}

// -----------------------------------------------------------------------------
function DashboardPage({ user }: { user: User }) {
  const productsLoader = useCallback(() => fetchAdminProducts(), []);
  const usersLoader = useCallback(() => fetchAdminUsers(), []);
  const partnersLoader = useCallback(() => fetchAdminPartners(), []);
  const rfqLoader = useCallback(() => fetchAdminRFQs(), []);
  const products = useAsyncData<any[]>(productsLoader);
  const users = useAsyncData<any[]>(usersLoader);
  const partners = useAsyncData<any[]>(partnersLoader);
  const rfqs = useAsyncData<any[]>(rfqLoader);

  const refresh = () => {
    products.refresh();
    users.refresh();
    partners.refresh();
    rfqs.refresh();
  };

  const productsCount = products.state.status === "ready" ? products.state.data.length : "—";
  // Derive customers by filtering users where role is 'customer' (or role absent).
  const customersCount =
    users.state.status === "ready"
      ? users.state.data.filter((u: any) => !u.role || u.role === "customer").length
      : "—";
  const partnersCount = partners.state.status === "ready" ? partners.state.data.length : "—";
  const rfqCount = rfqs.state.status === "ready" ? rfqs.state.data.length : "—";

  return (
    <DashboardPageScroll
      onRefresh={refresh}
      refreshing={products.refreshing || users.refreshing || partners.refreshing || rfqs.refreshing}
      testID="admin-page-dashboard"
    >
      <ProfileCard user={user} />

      <SectionTitle>Platform stats</SectionTitle>
      <View style={styles.statGrid}>
        <StatCard icon="cube-outline" label="Total Products" value={productsCount as any} testID="admin-stat-products" />
        <StatCard icon="people-outline" label="Customers" value={customersCount as any} testID="admin-stat-customers" />
        <StatCard icon="business-outline" label="Partners" value={partnersCount as any} testID="admin-stat-partners" />
        <StatCard icon="document-text-outline" label="RFQs" value={rfqCount as any} testID="admin-stat-rfqs" />
      </View>

      <SectionTitle>Recent RFQs</SectionTitle>
      {rfqs.state.status === "loading" ? (
        <LoadingBlock />
      ) : rfqs.state.status === "error" ? (
        <ErrorPanel error={rfqs.state.error} onRetry={rfqs.refresh} testID="admin-dashboard-rfqs-error" />
      ) : rfqs.state.data.length === 0 ? (
        <EmptyPanel icon="document-text-outline" title="No RFQs yet" testID="admin-dashboard-rfqs-empty" />
      ) : (
        rfqs.state.data.slice(0, 5).map((r: any) => (
          <GenericListCard
            key={r.id}
            title={r.name ?? "RFQ"}
            subtitle={r.description}
            status={r.status}
            meta={[
              r.email ? { label: "From", value: r.email } : undefined,
              r.quantity ? { label: "Qty", value: r.quantity } : undefined,
              r.createdAt ? { label: "Date", value: new Date(r.createdAt).toLocaleDateString() } : undefined,
            ].filter((m): m is { label: string; value: string } => !!m)}
            testID={`admin-recent-rfq-${r.id}`}
          />
        ))
      )}
    </DashboardPageScroll>
  );
}

function ProductsPage() {
  const loader = useCallback(() => fetchAdminProducts(), []);
  const { state, refresh, refreshing } = useAsyncData<any[]>(loader);
  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={refreshing} testID="admin-page-products">
      <SectionTitle>Manage Products ({state.status === "ready" ? state.data.length : "…"})</SectionTitle>
      {state.status === "loading" ? (
        <LoadingBlock />
      ) : state.status === "error" ? (
        <ErrorPanel error={state.error} onRetry={refresh} testID="admin-products-error" />
      ) : state.data.length === 0 ? (
        <EmptyPanel icon="cube-outline" title="No products" hint="Add products from the website admin panel." testID="admin-products-empty" />
      ) : (
        state.data.slice(0, 50).map((p: any, i: number) => (
          <GenericListCard
            key={p.id ?? p.slug ?? i}
            title={p.name ?? p.title ?? `Product #${i + 1}`}
            subtitle={p.description}
            status={p.hidden ? "hidden" : "live"}
            meta={[
              p.category ? { label: "Category", value: p.category } : undefined,
              p.moq != null ? { label: "MOQ", value: String(p.moq) } : undefined,
              p.price != null ? { label: "Price", value: `₹${p.price}` } : undefined,
            ].filter((m): m is { label: string; value: string } => !!m)}
            testID={`admin-product-${p.id ?? p.slug ?? i}`}
          />
        ))
      )}
    </DashboardPageScroll>
  );
}

function PartnersPage() {
  const loader = useCallback(() => fetchAdminPartners(), []);
  const { state, refresh, refreshing } = useAsyncData<any[]>(loader);
  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={refreshing} testID="admin-page-partners">
      <SectionTitle>Manage Partners ({state.status === "ready" ? state.data.length : "…"})</SectionTitle>
      {state.status === "loading" ? (
        <LoadingBlock />
      ) : state.status === "error" ? (
        <ErrorPanel error={state.error} onRetry={refresh} testID="admin-partners-error" />
      ) : state.data.length === 0 ? (
        <EmptyPanel icon="business-outline" title="No partners" testID="admin-partners-empty" />
      ) : (
        state.data.slice(0, 50).map((p: any, i: number) => (
          <GenericListCard
            key={p.id ?? p.email ?? i}
            title={p.companyName ?? p.name ?? p.email ?? `Partner #${i + 1}`}
            subtitle={p.email ?? p.phone}
            status={p.verified === true ? "verified" : p.verificationStatus ?? (p.verified === false ? "pending" : undefined)}
            meta={[
              p.city ?? p.address?.city ? { label: "City", value: p.city ?? p.address?.city } : undefined,
              p.gstin ? { label: "GSTIN", value: p.gstin } : undefined,
              p.createdAt ? { label: "Joined", value: new Date(p.createdAt).toLocaleDateString() } : undefined,
            ].filter((m): m is { label: string; value: string } => !!m)}
            testID={`admin-partner-${p.id ?? i}`}
          />
        ))
      )}
    </DashboardPageScroll>
  );
}

function CustomersPage() {
  // Derive customers from /api/admin/users filtered by role
  const loader = useCallback(async () => {
    const users = await fetchAdminUsers();
    return users.filter((u: any) => !u.role || u.role === "customer");
  }, []);
  const { state, refresh, refreshing } = useAsyncData<any[]>(loader);
  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={refreshing} testID="admin-page-customers">
      <SectionTitle>Manage Customers ({state.status === "ready" ? state.data.length : "…"})</SectionTitle>
      {state.status === "loading" ? (
        <LoadingBlock />
      ) : state.status === "error" ? (
        <ErrorPanel error={state.error} onRetry={refresh} testID="admin-customers-error" />
      ) : state.data.length === 0 ? (
        <EmptyPanel icon="people-outline" title="No customers" testID="admin-customers-empty" />
      ) : (
        state.data.slice(0, 100).map((c: any, i: number) => (
          <GenericListCard
            key={c.id ?? c.email ?? i}
            title={c.name ?? c.email ?? `Customer #${i + 1}`}
            subtitle={c.email}
            meta={[
              c.phone ? { label: "Phone", value: c.phone } : undefined,
              c.company ?? c.companyName ? { label: "Company", value: c.company ?? c.companyName } : undefined,
              c.createdAt ? { label: "Joined", value: new Date(c.createdAt).toLocaleDateString() } : undefined,
            ].filter((m): m is { label: string; value: string } => !!m)}
            testID={`admin-customer-${c.id ?? i}`}
          />
        ))
      )}
    </DashboardPageScroll>
  );
}

function RFQsPage() {
  const loader = useCallback(() => fetchAdminRFQs(), []);
  const { state, refresh, refreshing } = useAsyncData<any[]>(loader);
  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={refreshing} testID="admin-page-rfqs">
      <SectionTitle>Manage RFQs ({state.status === "ready" ? state.data.length : "…"})</SectionTitle>
      {state.status === "loading" ? (
        <LoadingBlock />
      ) : state.status === "error" ? (
        <ErrorPanel error={state.error} onRetry={refresh} testID="admin-rfqs-error" />
      ) : state.data.length === 0 ? (
        <EmptyPanel icon="document-text-outline" title="No RFQs" testID="admin-rfqs-empty" />
      ) : (
        state.data.slice(0, 100).map((r: any) => (
          <GenericListCard
            key={r.id}
            title={r.name ?? "RFQ"}
            subtitle={r.description}
            status={r.status}
            meta={[
              r.email ? { label: "From", value: r.email } : undefined,
              r.quantity ? { label: "Qty", value: r.quantity } : undefined,
              r.category ? { label: "Category", value: r.category } : undefined,
              r.createdAt ? { label: "Date", value: new Date(r.createdAt).toLocaleDateString() } : undefined,
            ].filter((m): m is { label: string; value: string } => !!m)}
            testID={`admin-rfq-${r.id}`}
          />
        ))
      )}
    </DashboardPageScroll>
  );
}

function OrdersPage() {
  const loader = useCallback(() => fetchAdminOrders(), []);
  const { state, refresh, refreshing } = useAsyncData<any[]>(loader);
  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={refreshing} testID="admin-page-orders">
      <SectionTitle>Manage Orders ({state.status === "ready" ? state.data.length : "…"})</SectionTitle>
      {state.status === "loading" ? (
        <LoadingBlock />
      ) : state.status === "error" ? (
        <ErrorPanel error={state.error} onRetry={refresh} testID="admin-orders-error" />
      ) : state.data.length === 0 ? (
        <EmptyPanel icon="bag-handle-outline" title="No orders yet" hint="Orders placed via checkout appear here." testID="admin-orders-empty" />
      ) : (
        state.data.map((o: any, i: number) => (
          <GenericListCard
            key={o.id ?? i}
            title={o.productName ?? `Order #${(o.id ?? "").slice?.(0, 8) ?? i + 1}`}
            subtitle={o.customerName ? `${o.customerName} · ${o.customerEmail}` : o.customerEmail}
            status={o.status}
            meta={[
              o.quantity != null ? { label: "Qty", value: String(o.quantity) } : undefined,
              o.total != null ? { label: "Total", value: `₹${o.total}` } : undefined,
              o.createdAt ? { label: "Date", value: new Date(o.createdAt).toLocaleDateString() } : undefined,
            ].filter((m): m is { label: string; value: string } => !!m)}
            testID={`admin-order-${o.id ?? i}`}
          />
        ))
      )}
    </DashboardPageScroll>
  );
}

function CategoriesPage() {
  const loader = useCallback(() => fetchAdminHomeCategories(), []);
  const { state, refresh, refreshing } = useAsyncData<AdminHomeCategoryRow[]>(loader);
  const [rows, setRows] = useState<AdminHomeCategoryRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "ready") {
      setRows([...state.data].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)));
    }
  }, [state]);

  const toggle = (slug: string) => {
    setRows((prev) => (prev ? prev.map((r) => (r.slug === slug ? { ...r, enabled: !r.enabled } : r)) : prev));
    setSaveMsg(null);
  };

  const move = (index: number, dir: -1 | 1) => {
    setRows((prev) => {
      if (!prev) return prev;
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaveMsg(null);
  };

  const save = async () => {
    if (!rows) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await saveAdminHomeCategories(rows.map((r, i) => ({ slug: r.slug, order: i, enabled: r.enabled })));
      setSaveMsg("Saved. The app's Home screen updates within a few seconds.");
    } catch (e: any) {
      setSaveMsg(e?.message ? `Save failed: ${e.message}` : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={refreshing} testID="admin-page-categories">
      <SectionTitle>Homepage Categories</SectionTitle>
      <Text style={styles.categoriesHint}>
        Choose which categories appear on the app&apos;s Home screen and in what order. Toggle a
        category on, use the arrows to set its position, then tap Save.
      </Text>
      {state.status === "loading" || !rows ? (
        <LoadingBlock />
      ) : state.status === "error" ? (
        <ErrorPanel error={state.error} onRetry={refresh} testID="admin-categories-error" />
      ) : rows.length === 0 ? (
        <EmptyPanel
          icon="layers-outline"
          title="No categories found"
          hint="Add categories from the website admin panel first, then come back here to feature them."
          testID="admin-categories-empty"
        />
      ) : (
        <>
          {rows.map((r, i) => (
            <View key={r.slug} style={styles.categoryRow} testID={`admin-category-row-${r.slug}`}>
              <View style={styles.categoryOrderCol}>
                <TouchableOpacity
                  disabled={i === 0}
                  onPress={() => move(i, -1)}
                  style={styles.categoryOrderBtn}
                  testID={`admin-category-up-${r.slug}`}
                >
                  <Ionicons name="chevron-up" size={16} color={i === 0 ? colors.border : colors.brand} />
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={i === rows.length - 1}
                  onPress={() => move(i, 1)}
                  style={styles.categoryOrderBtn}
                  testID={`admin-category-down-${r.slug}`}
                >
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={i === rows.length - 1 ? colors.border : colors.brand}
                  />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryName}>{r.name}</Text>
                {r.desc ? (
                  <Text style={styles.categoryDesc} numberOfLines={1}>
                    {r.desc}
                  </Text>
                ) : null}
              </View>
              <Switch
                value={r.enabled}
                onValueChange={() => toggle(r.slug)}
                trackColor={{ false: colors.border, true: colors.brandTint }}
                thumbColor={r.enabled ? colors.brand : undefined}
                testID={`admin-category-toggle-${r.slug}`}
              />
            </View>
          ))}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={save}
            disabled={saving}
            testID="admin-categories-save"
          >
            <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Save"}</Text>
          </TouchableOpacity>
          {saveMsg ? (
            <Text style={styles.saveMsg} testID="admin-categories-save-msg">
              {saveMsg}
            </Text>
          ) : null}
        </>
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
  categoriesHint: {
    fontSize: font.sm,
    color: colors.muted,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  categoryOrderCol: {
    gap: 2,
  },
  categoryOrderBtn: {
    padding: 2,
  },
  categoryName: {
    fontSize: font.base,
    fontWeight: "600",
    color: colors.onSurface,
  },
  categoryDesc: {
    fontSize: font.sm,
    color: colors.muted,
  },
  saveButton: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.onSurfaceInverse,
    fontWeight: "700",
    fontSize: font.base,
  },
  saveMsg: {
    fontSize: font.sm,
    color: colors.success,
    textAlign: "center",
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
  },
});
