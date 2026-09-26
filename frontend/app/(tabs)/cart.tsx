import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useApp } from "@/src/context/AppContext";
import { useCart } from "@/src/context/CartContext";
import { checkoutWithWallet, fetchWallet } from "@/src/api";
import type { WalletSnapshot } from "@/src/api/types";
import { colors, font, radius, shadow, spacing } from "@/src/theme";

export default function CartScreen() {
  const router = useRouter();
  const { user } = useApp();
  const { cart, loading, error, refresh, updateItem, removeItem, checkout } = useCart();

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchWallet().then(setWallet).catch(() => setWallet(null));
  }, [user?.id]);

  const onQty = useCallback(
    async (productId: string, next: number) => {
      if (!productId) return;
      setBusyKey(productId);
      setBanner(null);
      try {
        if (next <= 0) await removeItem(productId);
        else await updateItem(productId, next);
      } catch (e: any) {
        setBanner(e?.message ?? "Update failed");
      } finally {
        setBusyKey(null);
      }
    },
    [removeItem, updateItem],
  );

  const onCheckout = useCallback(async () => {
    setCheckingOut(true);
    setBanner(null);
    try {
      const res = await checkout();
      const ref = res?.orderId ?? res?.id;
      setBanner(ref ? `Order placed (ref: ${String(ref).slice(0, 8)}).` : "Order placed.");
    } catch (e: any) {
      setBanner(e?.message ?? "Checkout failed. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  }, [checkout]);

  const onWalletCheckout = useCallback(async () => {
    setCheckingOut(true);
    setBanner(null);
    try {
      const res = await checkoutWithWallet();
      setBanner(`Order ${res.order.number} paid from your wallet.`);
      await Promise.all([refresh(), fetchWallet().then(setWallet)]);
    } catch (e: any) {
      setBanner(e?.message ?? "Wallet checkout failed. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  }, [refresh]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]} testID="cart-screen">
        <View style={styles.header}>
          <Text style={styles.title}>Cart</Text>
        </View>
        <View style={styles.empty}>
          <Ionicons name="lock-closed-outline" size={40} color={colors.brand} />
          <Text style={styles.emptyTitle}>Sign in to view your cart</Text>
          <Text style={styles.emptyHint}>Your saved items and orders live with your account.</Text>
          <TouchableOpacity
            style={styles.cta}
            onPress={() => router.push("/(tabs)/account")}
            testID="cart-signin-cta"
          >
            <Text style={styles.ctaText}>Go to Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const items = cart.items ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="cart-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Cart</Text>
        <Text style={styles.subtitle}>
          {cart.itemCount ?? 0} item{(cart.itemCount ?? 0) === 1 ? "" : "s"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.brand} />}
      >
        {banner ? (
          <View style={styles.banner} testID="cart-banner">
            <Text style={styles.bannerText}>{banner}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={[styles.banner, { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" }]}>
            <Text style={[styles.bannerText, { color: "#B91C1C" }]}>{error}</Text>
          </View>
        ) : null}

        {loading && items.length === 0 ? (
          <ActivityIndicator color={colors.brand} style={{ marginVertical: spacing.xxl }} />
        ) : items.length === 0 ? (
          <View style={styles.empty} testID="cart-empty">
            <Ionicons name="cart-outline" size={40} color={colors.brand} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyHint}>Browse products and add items to see them here.</Text>
            <TouchableOpacity
              style={styles.cta}
              onPress={() => router.push("/(tabs)/products")}
              testID="cart-browse-cta"
            >
              <Text style={styles.ctaText}>Browse Products</Text>
            </TouchableOpacity>
          </View>
        ) : (
          items.map((it, i) => {
            const pid = String(it.productId ?? it.id ?? it.slug ?? i);
            const line = (Number(it.price) || 0) * (it.quantity ?? 0);
            return (
              <View key={pid} style={styles.row} testID={`cart-item-${pid}`}>
                {it.image ? (
                  <Image source={{ uri: it.image }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: colors.surfaceTertiary }]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={2}>
                    {it.name ?? it.slug ?? "Item"}
                  </Text>
                  <Text style={styles.price}>
                    ₹{it.price ?? "—"} × {it.quantity} = ₹{line || "—"}
                  </Text>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => onQty(pid, (it.quantity ?? 1) - 1)}
                      disabled={busyKey === pid}
                      testID={`cart-item-${pid}-decrement`}
                    >
                      <Ionicons name="remove" size={16} color={colors.brand} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText} testID={`cart-item-${pid}-qty`}>{it.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => onQty(pid, (it.quantity ?? 0) + 1)}
                      disabled={busyKey === pid}
                      testID={`cart-item-${pid}-increment`}
                    >
                      <Ionicons name="add" size={16} color={colors.brand} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.remove}
                      onPress={() => onQty(pid, 0)}
                      disabled={busyKey === pid}
                      testID={`cart-item-${pid}-remove`}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.error} />
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {items.length > 0 ? (
        <View style={styles.footer} testID="cart-footer">
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue} testID="cart-subtotal">
              ₹{cart.subtotal ?? 0}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.checkout, checkingOut && { opacity: 0.7 }]}
            onPress={onCheckout}
            disabled={checkingOut}
            activeOpacity={0.9}
            testID="cart-checkout-button"
          >
            {checkingOut ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                <Text style={styles.checkoutText}>Checkout</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.walletHint}>
            Wallet balance: ₹{Number(wallet?.balance ?? 0).toLocaleString("en-IN")}
          </Text>
          <TouchableOpacity
            style={[styles.walletCheckout, (checkingOut || !wallet || wallet.balance < Number(cart.subtotal ?? 0)) && { opacity: 0.5 }]}
            onPress={onWalletCheckout}
            disabled={checkingOut || !wallet || wallet.balance < Number(cart.subtotal ?? 0)}
            activeOpacity={0.9}
            testID="cart-wallet-checkout-button"
          >
            {checkingOut ? <ActivityIndicator color="#FFFFFF" /> : <>
              <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
              <Text style={styles.checkoutText}>Pay with Wallet</Text>
            </>}
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: font.xxl, color: colors.onSurface, fontWeight: "500" },
  subtitle: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  banner: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: spacing.md,
  },
  bannerText: { color: colors.success, fontSize: font.base, fontWeight: "500" },
  empty: {
    alignItems: "center",
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: "500", marginTop: spacing.md },
  emptyHint: { color: colors.muted, fontSize: font.base, textAlign: "center" },
  cta: {
    marginTop: spacing.md,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  ctaText: { color: "#FFFFFF", fontWeight: "500", fontSize: font.base },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  thumb: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  name: { fontSize: font.base, color: colors.onSurface, fontWeight: "500" },
  price: { fontSize: font.sm, color: colors.brand, marginTop: 2 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { minWidth: 24, textAlign: "center", fontSize: font.base, color: colors.onSurface, fontWeight: "500" },
  remove: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" },
  removeText: { color: colors.error, fontSize: font.sm, fontWeight: "500" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.card,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
  totalLabel: { fontSize: font.base, color: colors.muted },
  totalValue: { fontSize: font.xl, color: colors.brand, fontWeight: "500" },
  checkout: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  checkoutText: { color: "#FFFFFF", fontSize: font.lg, fontWeight: "500" },
  walletHint: { color: colors.onSurfaceSecondary, textAlign: "center", fontSize: font.sm, marginTop: spacing.sm },
  walletCheckout: { marginTop: spacing.sm, minHeight: 52, borderRadius: radius.md, backgroundColor: colors.success, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
});
