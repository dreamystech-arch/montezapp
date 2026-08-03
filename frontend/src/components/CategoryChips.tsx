import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

import type { Category } from "@/src/api/types";
import { colors, font, radius, spacing } from "@/src/theme";

type Props = {
  categories: Category[];
  selected: string;
  onSelect: (slug: string) => void;
};

export function CategoryChips({ categories, selected, onSelect }: Props) {
  const items = [{ id: "all", slug: "all", name: "All" } as Category, ...categories];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
      testID="category-chips-row"
    >
      {items.map((c) => {
        const active = c.slug === selected;
        return (
          <TouchableOpacity
            key={c.id}
            onPress={() => onSelect(c.slug)}
            style={[styles.chip, active && styles.chipActive]}
            activeOpacity={0.85}
            testID={`chip-${c.slug}`}
            accessibilityLabel={`category-chip-${c.slug}`}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
              {c.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { height: 56 },
  row: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: "center",
    height: 56,
  },
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipText: { fontSize: font.base, color: colors.onSurfaceSecondary, fontWeight: "500" },
  chipTextActive: { color: "#FFFFFF" },
});
