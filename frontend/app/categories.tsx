import { useCallback, useEffect, useState } from "react";
import { Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { fetchHomeCategories } from "@/src/api";
import type { Category } from "@/src/api/types";
import { colors, font, radius, shadow, spacing } from "@/src/theme";

/** Full categories grid — same admin-managed list as the Home screen's
 * category scroller, reached via its "See all" link. */
export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const cats = await fetchHomeCategories();
    setCategories(cats);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          testID="categories-back-button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Categories</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        testID="categories-grid"
      >
        {categories.map((c) => (
          <TouchableOpacity
            key={c.slug}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: "/(tabs)/products", params: { category: c.slug } })}
            testID={`categories-card-${c.slug}`}
          >
            {c.image ? (
              <Image source={{ uri: c.image }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.iconWrap}>
                <Ionicons name="pricetag-outline" size={24} color={colors.brand} />
              </View>
            )}
            <Text style={styles.name} numberOfLines={2}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
        {!loading && categories.length === 0 ? (
          <Text style={{ color: colors.muted, paddingVertical: spacing.xxl }}>No categories to show yet.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: font.lg, fontWeight: "500", color: colors.onSurface },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  card: {
    width: "47%",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    gap: spacing.sm,
    ...shadow.card,
  },
  image: { width: "100%", height: 96, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: font.sm,
    color: colors.onSurface,
    fontWeight: "500",
    textAlign: "center",
    textTransform: "capitalize",
  },
});
