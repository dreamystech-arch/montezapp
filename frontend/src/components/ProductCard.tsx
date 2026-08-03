import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import type { Product } from "@/src/api/types";
import { colors, font, radius, shadow, spacing } from "@/src/theme";

export function ProductCard({ product, testID }: { product: Product; testID?: string }) {
  const router = useRouter();
  const price = product.price ?? (product.priceFrom ? `${product.priceFrom}` : "—");
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={() => router.push(`/product/${product.slug}`)}
      testID={testID ?? `product-card-${product.slug}`}
    >
      <View style={styles.imageWrap}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.category} numberOfLines={1}>
          {product.category.replace(/-/g, " ")}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>MOQ</Text>
            <Text style={styles.metaValue}>{product.moq}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.metaLabel}>Price</Text>
            <Text style={styles.priceValue}>₹{price}/unit</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadow.card,
  },
  imageWrap: { aspectRatio: 1, backgroundColor: colors.surfaceTertiary },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, backgroundColor: colors.surfaceTertiary },
  body: { padding: spacing.md, gap: spacing.xs },
  category: {
    fontSize: font.sm,
    color: colors.muted,
    textTransform: "capitalize",
  },
  name: {
    fontSize: font.base,
    color: colors.onSurface,
    fontWeight: "500",
    minHeight: 36,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: spacing.xs,
  },
  metaLabel: { fontSize: 10, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: font.base, color: colors.onSurface, fontWeight: "500" },
  priceValue: { fontSize: font.base, color: colors.brand, fontWeight: "500" },
});
