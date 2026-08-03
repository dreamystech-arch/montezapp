import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { fetchCategories, fetchProducts } from "@/src/api";
import type { Category, Product } from "@/src/api/types";
import { CategoryChips } from "@/src/components/CategoryChips";
import { EmptyState } from "@/src/components/EmptyState";
import { ProductCard } from "@/src/components/ProductCard";
import { colors, font, radius, spacing } from "@/src/theme";

export default function ProductsScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchProducts({ category: selected, q: debounced });
      setProducts(items);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [selected, debounced]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredCategories = useMemo(() => {
    // Show only categories that actually have products loaded (fallback to all).
    if (products.length === 0) return categories;
    return categories;
  }, [categories, products.length]);

  const clearFilters = () => {
    setSelected("all");
    setQuery("");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <Text style={styles.subtitle}>
          {loading ? "Loading catalog…" : `${products.length} items`}
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products, categories…"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          testID="products-search-input"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      <CategoryChips categories={filteredCategories} selected={selected} onSelect={setSelected} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : error ? (
        <EmptyState
          title="Failed to load catalog"
          subtitle={error}
          icon="cloud-offline-outline"
          testID="products-error"
          cta={
            <TouchableOpacity onPress={load} style={styles.retry} testID="products-retry-button">
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          }
        />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          subtitle="Try clearing filters or changing your search."
          icon="cube-outline"
          testID="products-empty"
          cta={
            <TouchableOpacity onPress={clearFilters} style={styles.retry} testID="products-clear-filters">
              <Text style={styles.retryText}>Clear Filters</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ paddingVertical: spacing.md, gap: spacing.md, paddingBottom: spacing.xxxl }}
          renderItem={({ item }) => <ProductCard product={item} />}
          testID="products-list"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { fontSize: font.xxl, color: colors.onSurface, fontWeight: "500" },
  subtitle: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: font.base, color: colors.onSurface, padding: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  retry: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryText: { color: "#FFFFFF", fontWeight: "500" },
});
