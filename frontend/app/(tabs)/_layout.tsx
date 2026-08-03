import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet } from "react-native";

import { colors } from "@/src/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function tabIcon(name: IconName) {
  const IconComp = ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
  IconComp.displayName = `TabIcon_${name}`;
  return IconComp;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === "ios" ? 84 : 62,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: "Home", tabBarIcon: tabIcon("home-outline"), tabBarTestID: "tab-home" }}
      />
      <Tabs.Screen
        name="products"
        options={{ title: "Products", tabBarIcon: tabIcon("grid-outline"), tabBarTestID: "tab-products" }}
      />
      <Tabs.Screen
        name="rfq"
        options={{ title: "RFQ", tabBarIcon: tabIcon("document-text-outline"), tabBarTestID: "tab-rfq" }}
      />
      <Tabs.Screen
        name="contact"
        options={{ title: "Contact", tabBarIcon: tabIcon("call-outline"), tabBarTestID: "tab-contact" }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: "Account", tabBarIcon: tabIcon("person-outline"), tabBarTestID: "tab-account" }}
      />
    </Tabs>
  );
}
