import React from "react";
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useApp } from "@/src/context/AppContext";
import { colors, font, radius, spacing } from "@/src/theme";

const openHref = (href?: string) => {
  if (!href) return;
  Linking.openURL(href).catch(() => {});
};

/**
 * Website-style footer, sourced entirely from CMS (`/api/cms/footer` — with
 * fallback to `/api/app-settings.settings.footer` and the local supplementary
 * backend). Renders at the bottom of scrollable screens.
 */
export function SiteFooter({ testID = "site-footer" }: { testID?: string }) {
  const { cms, settings } = useApp();
  const footer = cms?.footer;
  const logo = cms?.appLogo || settings?.logoUrl;

  const hasAnyContent =
    !!footer?.about ||
    (footer?.quickLinks?.length ?? 0) > 0 ||
    (footer?.contactColumns?.length ?? 0) > 0 ||
    (footer?.socials?.length ?? 0) > 0 ||
    !!footer?.copyright;

  if (!hasAnyContent) return null;

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.brandRow}>
        {logo ? (
          <Image source={{ uri: logo }} style={styles.logo} resizeMode="contain" testID="footer-logo" />
        ) : (
          <Text style={styles.brand}>Montez Infobyte</Text>
        )}
      </View>
      {footer?.about ? (
        <Text style={styles.about} testID="footer-about">
          {footer.about}
        </Text>
      ) : null}

      {footer?.quickLinks && footer.quickLinks.length > 0 ? (
        <View style={styles.section} testID="footer-quick-links">
          <Text style={styles.sectionTitle}>Quick Links</Text>
          {footer.quickLinks.map((l) => (
            <TouchableOpacity
              key={`${l.label}-${l.href}`}
              onPress={() => openHref(l.href)}
              style={styles.linkRow}
              activeOpacity={0.7}
              testID={`footer-link-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Ionicons name="chevron-forward" size={12} color={colors.brand} />
              <Text style={styles.linkText}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {footer?.contactColumns?.map((col, i) => (
        <View style={styles.section} key={`${col.title}-${i}`} testID={`footer-column-${col.title.toLowerCase().replace(/\s+/g, "-")}`}>
          <Text style={styles.sectionTitle}>{col.title}</Text>
          {(col.lines ?? []).map((line, idx) => (
            <Text key={idx} style={styles.contactLine}>
              {line}
            </Text>
          ))}
        </View>
      ))}

      {footer?.socials && footer.socials.length > 0 ? (
        <View style={styles.socialsRow} testID="footer-socials">
          {footer.socials.map((s) => (
            <TouchableOpacity
              key={`${s.label}-${s.href}`}
              onPress={() => openHref(s.href)}
              style={styles.socialBtn}
              activeOpacity={0.7}
              testID={`footer-social-${s.label.toLowerCase()}`}
            >
              <Ionicons
                name={(s.icon as any) || "globe-outline"}
                size={18}
                color={colors.brand}
              />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {footer?.copyright ? (
        <Text style={styles.copyright} testID="footer-copyright">
          {footer.copyright}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandRow: { alignItems: "flex-start", marginBottom: spacing.md },
  logo: { width: 140, height: 32 },
  brand: { color: colors.brand, fontSize: font.lg, fontWeight: "500" },
  about: {
    color: colors.onSurfaceSecondary,
    fontSize: font.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: font.sm,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 6,
  },
  linkText: { color: colors.onSurfaceSecondary, fontSize: font.base },
  contactLine: {
    color: colors.onSurfaceSecondary,
    fontSize: font.sm,
    lineHeight: 20,
    marginBottom: 2,
  },
  socialsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
    flexWrap: "wrap",
  },
  socialBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  copyright: {
    color: colors.muted,
    fontSize: font.sm,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
