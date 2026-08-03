import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, font, radius, spacing } from "@/src/theme";

type Props = {
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  cta?: React.ReactNode;
  testID?: string;
};

export function EmptyState({ title, subtitle, icon = "cube-outline", cta, testID }: Props) {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={40} color={colors.brand} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {cta ? <View style={{ marginTop: spacing.lg }}>{cta}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { color: colors.onSurface, fontSize: font.lg, fontWeight: "500", marginBottom: spacing.xs },
  subtitle: { color: colors.muted, fontSize: font.base, textAlign: "center" },
});
