import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { fetchHomeCategories, fetchProducts } from "@/src/api";
import type { Category, HomeBanner, Product } from "@/src/api/types";
import { ProductCard } from "@/src/components/ProductCard";
import { SiteFooter } from "@/src/components/SiteFooter";
import { useApp } from "@/src/context/AppContext";
import { registerForPushAsync } from "@/src/utils/push";
import { colors, font, radius, shadow, spacing } from "@/src/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { cms, settings, refreshBoot, refreshCMS, user } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [homeCategories, setHomeCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [items, cats] = await Promise.all([fetchProducts(), fetchHomeCategories()]);
      setProducts(items.slice(0, 8));
      setHomeCategories(cats);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch CMS + settings every time Home comes into focus so admin edits
  // (banner, announcement, logo, welcome content) reflect without a restart.
  useFocusEffect(
    useCallback(() => {
      refreshCMS();
    }, [refreshCMS]),
  );

  useEffect(() => {
    const anon = user?.id ?? "guest";
    registerForPushAsync(anon);
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshBoot(), load()]);
  }, [refreshBoot, load]);

  const bannerImage = cms?.homeBannerImage ?? "";
  const banners = cms?.homeBanners && cms.homeBanners.length > 0
    ? cms.homeBanners
    : bannerImage
    ? [{ image: bannerImage, title: "", subtitle: "", ctaLink: "" }]
    : [];
  const announcement = cms?.announcement ?? "";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        {settings?.logoUrl ? (
          <Image source={{ uri: settings.logoUrl }} style={styles.logo} resizeMode="contain" testID="home-app-logo" />
        ) : (
          <Text style={styles.brand}>Montez Infobyte</Text>
        )}
        <TouchableOpacity
          style={styles.searchIcon}
          onPress={() => router.push("/(tabs)/products")}
          testID="home-search-button"
        >
          <Ionicons name="search-outline" size={22} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
        contentContainerStyle={{ paddingBottom: spacing.xxxl, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        ListHeaderComponent={
          <View>
            {/* CMS-driven banner carousel. All uploaded banners are rendered
                as a horizontal-paging list with standard side margin. */}
            {banners.length > 0 ? (
              <BannerCarousel banners={banners} onPress={() => router.push("/(tabs)/products")} />
            ) : null}

            {/* Announcement */}
            {announcement ? (
              <View style={styles.announcement} testID="home-announcement">
                <Ionicons name="megaphone-outline" size={16} color={colors.brand} />
                <Text style={styles.announcementText} numberOfLines={2}>
                  {announcement}
                </Text>
              </View>
            ) : null}

            {/* Trust indicators */}
            <View style={styles.stats}>
              <StatBlock label="Cities" value="100+" />
              <StatBlock label="Partners" value="500+" />
              <StatBlock label="Products" value="10K+" />
              <StatBlock label="Delivered" value="50K+" />
            </View>

            {homeCategories.length > 0 ? (
              <View testID="home-categories-section">
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Categories</Text>
                  <TouchableOpacity onPress={() => router.push("/(tabs)/products")}>
                    <Text style={styles.sectionLink}>See all</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesRow}
                  testID="home-categories-scroller"
                >
                  {homeCategories.map((c) => (
                    <TouchableOpacity
                      key={c.slug}
                      style={styles.categoryCard}
                      activeOpacity={0.85}
                      onPress={() =>
                        router.push({ pathname: "/(tabs)/products", params: { category: c.slug } })
                      }
                      testID={`home-category-${c.slug}`}
                    >
                      <View style={styles.categoryIconWrap}>
                        <Ionicons name="pricetag-outline" size={20} color={colors.brand} />
                      </View>
                      <Text style={styles.categoryName} numberOfLines={2}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Products</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/products")}>
                <Text style={styles.sectionLink}>See all</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => <ProductCard product={item} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingVertical: spacing.xxxl, alignItems: "center" }}>
              <ActivityIndicator color={colors.brand} />
            </View>
          ) : (
            <View style={{ paddingVertical: spacing.xxl, alignItems: "center" }}>
              <Text style={{ color: colors.muted }}>No featured products right now.</Text>
            </View>
          )
        }
        ListFooterComponent={<SiteFooter />}
        testID="home-featured-list"
      />
    </SafeAreaView>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BannerCarousel({
  banners,
  onPress,
}: {
  banners: HomeBanner[];
  onPress: () => void;
}) {
  const { width } = useWindowDimensions();
  const sideMargin = spacing.lg;
  const cardWidth = Math.max(1, width - sideMargin * 2);
  const cardHeight = Math.round(cardWidth * 9 / 16);
  const [index, setIndex] = useState(0);

  const onScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    if (i !== index) setIndex(i);
  };

  const handlePress = (b: HomeBanner) => {
    if (b.ctaLink) {
      Linking.openURL(b.ctaLink).catch(() => {});
      return;
    }
    onPress();
  };

  return (
    <View style={{ marginBottom: spacing.lg }} testID="home-banner">
      <FlatList
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={banners}
        keyExtractor={(b, i) => `${b.image}-${i}`}
        snapToInterval={cardWidth}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={{ paddingHorizontal: sideMargin }}
        ItemSeparatorComponent={() => <View style={{ width: 0 }} />}
        renderItem={({ item, index: i }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handlePress(item)}
            style={{
              width: cardWidth,
              height: cardHeight,
              borderRadius: radius.lg,
              overflow: "hidden",
              backgroundColor: colors.surfaceTertiary,
            }}
            testID={`home-banner-slide-${i}`}
          >
            <Image
              source={{ uri: item.image }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
              testID={`home-banner-image-${i}`}
            />
          </TouchableOpacity>
        )}
        testID="home-banner-carousel"
      />
      {banners.length > 1 ? (
        <View style={styles.dots} testID="home-banner-dots">
          {banners.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
              testID={`home-banner-dot-${i}`}
            />
          ))}
        </View>
      ) : null}
    </View>
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
  logo: { width: 120, height: 32 },
  brand: { fontSize: font.xl, color: colors.brand, fontWeight: "500" },
  searchIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerWrap: {
    marginHorizontal: 0,
    borderRadius: 0,
    overflow: "hidden",
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceTertiary,
    marginBottom: spacing.lg,
  },
  bannerImage: { width: "100%", height: "100%" },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.brand,
    width: 18,
  },
  bannerText: { position: "absolute", left: 20, right: 20, bottom: 16 },
  bannerBadge: {
    color: "#FFFFFF",
    fontSize: font.sm,
    marginBottom: spacing.xs,
    opacity: 0.85,
  },
  bannerHeadline: {
    color: "#FFFFFF",
    fontSize: font.xl,
    fontWeight: "500",
    lineHeight: 26,
    marginBottom: spacing.md,
  },
  bannerCta: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  bannerCtaText: { color: colors.brand, fontWeight: "500", fontSize: font.base },
  announcement: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.brandTint,
    padding: spacing.md,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  announcementText: { flex: 1, color: colors.brand, fontSize: font.base, fontWeight: "500" },
  stats: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    ...shadow.card,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { color: colors.brand, fontSize: font.lg, fontWeight: "500" },
  statLabel: { color: colors.muted, fontSize: font.sm, marginTop: 2 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: "500" },
  sectionLink: { color: colors.brand, fontSize: font.base, fontWeight: "500" },
  categoriesRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  categoryCard: {
    width: 104,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    gap: spacing.sm,
    ...shadow.card,
  },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryName: {
    fontSize: font.sm,
    color: colors.onSurface,
    fontWeight: "500",
    textAlign: "center",
    textTransform: "capitalize",
  },
});
