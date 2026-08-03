import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { fetchProductBySlug } from "@/src/api";
import type { Product } from "@/src/api/types";
import { colors, font, radius, shadow, spacing } from "@/src/theme";

export default function ProductDetail() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await fetchProductBySlug(String(slug));
      setProduct(p);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const gallery = product?.gallery?.length
    ? product.gallery
    : product?.image
    ? [product.image]
    : [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="product-back-button">
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {product?.name ?? "Product"}
        </Text>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : error || !product ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.muted} />
          <Text style={{ color: colors.muted, marginTop: spacing.md }}>{error ?? "Product not found"}</Text>
          <TouchableOpacity onPress={load} style={styles.retry} testID="product-retry-button">
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: 120 }} testID="product-detail-scroll">
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                setActiveIdx(idx);
              }}
              style={{ height: width, backgroundColor: colors.surfaceTertiary }}
            >
              {gallery.map((uri) => (
                <Image key={uri} source={{ uri }} style={{ width, height: width }} resizeMode="cover" />
              ))}
            </ScrollView>
            {gallery.length > 1 ? (
              <View style={styles.dots}>
                {gallery.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeIdx && styles.dotActive]} />
                ))}
              </View>
            ) : null}

            <View style={styles.body}>
              <Text style={styles.category}>{product.category.replace(/-/g, " ")}</Text>
              <Text style={styles.name} testID="product-name">
                {product.name}
              </Text>

              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>Starting from</Text>
                  <Text style={styles.priceValue}>₹{product.price ?? product.priceFrom ?? "—"}/unit</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.priceLabel}>MOQ</Text>
                  <Text style={styles.priceValue}>{product.moq} units</Text>
                </View>
              </View>

              <View style={styles.specGrid}>
                <SpecCard icon="time-outline" label="Lead time" value={product.leadTime ?? "10 days"} />
                <SpecCard icon="cube-outline" label="Material" value={product.material ?? "—"} />
              </View>

              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>
                {product.description ?? "No description available for this product."}
              </Text>

              {product.tags && product.tags.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>Tags</Text>
                  <View style={styles.tagRow}>
                    {product.tags.map((t) => (
                      <View key={t} style={styles.tag}>
                        <Text style={styles.tagText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.rfqCta}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/rfq",
                  params: {
                    productSlug: product.slug,
                    productName: product.name,
                    category: product.category,
                  },
                })
              }
              activeOpacity={0.9}
              testID="product-request-quote-button"
            >
              <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
              <Text style={styles.rfqCtaText}>Request Quote</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function SpecCard({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.specCard}>
      <Ionicons name={icon} size={18} color={colors.brand} />
      <View>
        <Text style={styles.specLabel}>{label}</Text>
        <Text style={styles.specValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  topBarTitle: { fontSize: font.base, color: colors.onSurface, fontWeight: "500", flex: 1, textAlign: "center" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  retry: {
    backgroundColor: colors.brand,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryText: { color: "#FFFFFF", fontWeight: "500" },
  dots: {
    flexDirection: "row",
    gap: 6,
    alignSelf: "center",
    marginTop: -18,
    marginBottom: spacing.md,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { backgroundColor: "#FFFFFF", width: 16 },
  body: { padding: spacing.lg, gap: spacing.md },
  category: { fontSize: font.sm, color: colors.muted, textTransform: "capitalize" },
  name: { fontSize: font.xxl, color: colors.onSurface, fontWeight: "500", lineHeight: 30 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceLabel: { fontSize: font.sm, color: colors.muted, marginBottom: 2 },
  priceValue: { fontSize: font.lg, color: colors.brand, fontWeight: "500" },
  specGrid: { flexDirection: "row", gap: spacing.md },
  specCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.brandTint,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  specLabel: { fontSize: font.sm, color: colors.muted },
  specValue: { fontSize: font.base, color: colors.onSurface, fontWeight: "500" },
  sectionTitle: {
    fontSize: font.base,
    fontWeight: "500",
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  description: { fontSize: font.base, color: colors.onSurfaceSecondary, lineHeight: 22 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: { fontSize: font.sm, color: colors.onSurfaceSecondary },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.card,
  },
  rfqCta: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  rfqCtaText: { color: "#FFFFFF", fontSize: font.lg, fontWeight: "500" },
});
