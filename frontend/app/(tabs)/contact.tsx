import { Ionicons } from "@expo/vector-icons";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApp } from "@/src/context/AppContext";
import { colors, font, radius, shadow, spacing } from "@/src/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type ContactItem = {
  icon: IconName;
  label: string;
  value: string;
  href?: string;
  testID: string;
};

export default function ContactScreen() {
  const { settings } = useApp();

  const items: ContactItem[] = [
    {
      icon: "call-outline",
      label: "Call us",
      value: settings?.phone ?? "+91 7639533953",
      href: `tel:${(settings?.phone ?? "+917639533953").replace(/\s+/g, "")}`,
      testID: "contact-phone",
    },
    {
      icon: "logo-whatsapp",
      label: "WhatsApp",
      value: settings?.whatsapp ?? "+91 7639533953",
      href: `https://wa.me/${(settings?.whatsapp ?? "+917639533953").replace(/\D+/g, "")}`,
      testID: "contact-whatsapp",
    },
    {
      icon: "mail-outline",
      label: "Email",
      value: settings?.email ?? "montez.spprt@gmail.com",
      href: `mailto:${settings?.email ?? "montez.spprt@gmail.com"}`,
      testID: "contact-email",
    },
    {
      icon: "location-outline",
      label: "Head Office",
      value:
        settings?.address ??
        "Door No 76, F2, 3rd Annai, Abirami Nagar, Thiruverkadu, Chennai – 600077",
      testID: "contact-address",
    },
  ];

  const social: ContactItem[] = [
    settings?.facebook ? { icon: "logo-facebook", label: "Facebook", value: "Follow", href: settings.facebook, testID: "contact-facebook" } : null,
    settings?.instagram ? { icon: "logo-instagram", label: "Instagram", value: "Follow", href: settings.instagram, testID: "contact-instagram" } : null,
    settings?.linkedin ? { icon: "logo-linkedin", label: "LinkedIn", value: "Follow", href: settings.linkedin, testID: "contact-linkedin" } : null,
    settings?.youtube ? { icon: "logo-youtube", label: "YouTube", value: "Subscribe", href: settings.youtube, testID: "contact-youtube" } : null,
  ].filter(Boolean) as ContactItem[];

  const open = (href?: string) => {
    if (!href) return;
    Linking.openURL(href).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Contact Us</Text>
        <Text style={styles.subtitle}>{settings?.tagline ?? "Talk to our sourcing experts"}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        {items.map((c) => (
          <TouchableOpacity
            key={c.testID}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => open(c.href)}
            testID={c.testID}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={c.icon} size={20} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{c.label}</Text>
              <Text style={styles.value} numberOfLines={3}>
                {c.value}
              </Text>
            </View>
            {c.href ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
          </TouchableOpacity>
        ))}

        {social.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Follow us</Text>
            <View style={styles.socialRow}>
              {social.map((s) => (
                <TouchableOpacity
                  key={s.testID}
                  style={styles.socialBtn}
                  onPress={() => open(s.href)}
                  testID={s.testID}
                  activeOpacity={0.85}
                >
                  <Ionicons name={s.icon} size={22} color={colors.brand} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: font.xxl, color: colors.onSurface, fontWeight: "500" },
  subtitle: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: font.sm, color: colors.muted, marginBottom: 2 },
  value: { fontSize: font.base, color: colors.onSurface, fontWeight: "500" },
  sectionTitle: {
    fontSize: font.base,
    color: colors.onSurface,
    fontWeight: "500",
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  socialRow: { flexDirection: "row", gap: spacing.md },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
});
