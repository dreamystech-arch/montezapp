import React from "react";
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useApp } from "@/src/context/AppContext";
import { UPSTREAM_BASE } from "@/src/api/client";
import { colors, font, radius, spacing } from "@/src/theme";

const openHref = (href?: string) => {
  if (!href) return;
  const target = href.startsWith("/") ? `${UPSTREAM_BASE}${href}` : href;
  Linking.openURL(target).catch(() => {});
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
    (footer?.policyLinks?.length ?? 0) > 0 ||
    !!footer?.storeBadges?.playStoreUrl ||
    !!footer?.storeBadges?.appStoreUrl ||
    (footer?.contactColumns?.length ?? 0) > 0 ||
    (footer?.socials?.length ?? 0) > 0 ||
    !!footer?.copyright;

  if (!hasAnyContent) return null;

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.brandRow}>
        {logo ? (
          <View style={styles.logoPlate}><Image source={{ uri: logo }} style={styles.logo} resizeMode="contain" testID="footer-logo" /></View>
        ) : (
          <Text style={styles.brand}>Montez <Text style={styles.brandAccent}>Infobyte</Text></Text>
        )}
      </View>
      {footer?.about ? (
        <Text style={styles.about} testID="footer-about">
          {footer.about}
        </Text>
      ) : null}

      {(footer?.storeBadges?.playStoreUrl || footer?.storeBadges?.appStoreUrl) ? (
        <View style={styles.downloadCard} testID="footer-app-stores">
          <View style={styles.downloadHeading}>
            <View style={styles.downloadIcon}><Ionicons name="phone-portrait-outline" size={17} color="#FFFFFF" /></View>
            <View style={styles.downloadCopy}>
              <Text style={styles.downloadTitle}>Take Montez with you</Text>
              <Text style={styles.downloadSubtitle}>Shop and connect wherever you are.</Text>
            </View>
          </View>
          <View style={styles.badgeRow}>
            {footer.storeBadges?.playStoreUrl && footer.storeBadges.playStoreImage ? (
              <TouchableOpacity onPress={() => openHref(footer.storeBadges?.playStoreUrl)} activeOpacity={0.8} testID="footer-play-store">
                <Image source={{ uri: footer.storeBadges.playStoreImage }} style={styles.storeBadge} resizeMode="contain" accessibilityLabel="Get it on Google Play" />
              </TouchableOpacity>
            ) : null}
            {footer.storeBadges?.appStoreUrl && footer.storeBadges.appStoreImage ? (
              <TouchableOpacity onPress={() => openHref(footer.storeBadges?.appStoreUrl)} activeOpacity={0.8} testID="footer-app-store">
                <Image source={{ uri: footer.storeBadges.appStoreImage }} style={styles.storeBadge} resizeMode="contain" accessibilityLabel="Download on the App Store" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      {footer?.policyLinks && footer.policyLinks.length > 0 ? (
        <View style={styles.section} testID="footer-policies">
          <Text style={styles.sectionTitle}>Policies</Text>
          <View style={styles.policiesRow}>
            {footer.policyLinks.map((l) => (
              <TouchableOpacity
                key={`${l.label}-${l.href}`}
                onPress={() => openHref(l.href)}
                style={styles.policyLink}
                activeOpacity={0.7}
                testID={`footer-policy-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Text style={styles.policyLinkText}>{l.label}</Text>
                <Ionicons name="arrow-up-outline" size={12} color="#FCA5A5" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: "#171923",
    borderWidth: 1,
    borderColor: "#282A36",
  },
  brandRow: { alignItems: "flex-start", marginBottom: spacing.md },
  logoPlate: { backgroundColor: "#FFFFFF", borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 5 },
  logo: { width: 132, height: 30 },
  brand: { color: "#FFFFFF", fontSize: font.xl, fontWeight: "700", letterSpacing: 0.1 },
  brandAccent: { color: "#FCA5A5" },
  about: {
    color: "#A8AAB8",
    fontSize: font.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
    maxWidth: 300,
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    color: "#FFFFFF",
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
  linkText: { color: "#C6C7D0", fontSize: font.base },
  contactLine: {
    color: "#A8AAB8",
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
  downloadCard: {
    backgroundColor: "#222430",
    borderColor: "#343644",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  downloadHeading: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  downloadIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", marginRight: spacing.sm },
  downloadCopy: { flex: 1 },
  downloadTitle: { color: "#FFFFFF", fontSize: font.base, fontWeight: "700" },
  downloadSubtitle: { color: "#A8AAB8", fontSize: font.sm, marginTop: 2 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  storeBadge: { width: 138, height: 44 },
  policiesRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  policyLink: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#242631", borderColor: "#373945", borderWidth: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.pill },
  policyLinkText: { color: "#D3D4DC", fontSize: font.sm },
  socialBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: "#292B38",
    alignItems: "center",
    justifyContent: "center",
  },
  copyright: {
    color: "#8C8E9A",
    fontSize: font.sm,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
