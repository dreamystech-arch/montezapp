import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/src/theme";
import { useCart } from "@/src/context/CartContext";

const GET_YOUR_STORE_URL = "https://montezinfobyte.com/get-your-store";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function tabIcon(name: IconName) {
  const IconComp = ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
  IconComp.displayName = `TabIcon_${name}`;
  return IconComp;
}

function CartTabIcon({ color, size }: { color: string; size: number }) {
  const { cart } = useCart();
  const count = cart.itemCount ?? 0;
  return (
    <View testID="tab-cart-icon" style={{ width: size + 8, height: size + 8, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name="cart-outline" color={color} size={size} />
      {count > 0 ? (
        <View style={{
          position: "absolute", top: -2, right: -2, minWidth: 16, height: 16,
          borderRadius: 8, backgroundColor: colors.brand, alignItems: "center",
          justifyContent: "center", paddingHorizontal: 3,
        }} testID="tab-cart-badge">
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>
            {count > 99 ? "99+" : String(count)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Comfortable tap target: 56pt visible tab + generous top padding + real
  // safe-area bottom inset (home indicator / gesture bar).
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 8 : 0);
  const tabBarHeight = 56 + bottomInset + 6; // 6pt breathing room above icon

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
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: bottomInset + 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
        tabBarItemStyle: { paddingVertical: 4 },
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
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: CartTabIcon,
          tabBarTestID: "tab-cart",
        }}
      />
      <Tabs.Screen
        name="rfq"
        options={{
          title: "Get Your Store",
          tabBarIcon: tabIcon("storefront-outline"),
          tabBarTestID: "tab-get-your-store",
        }}
        listeners={{
          tabPress: (e) => {
            // Intercept tab press: open external URL instead of navigating to
            // the RFQ screen. The screen remains reachable via product detail's
            // Request Quote button which uses router.push with params.
            e.preventDefault();
            Linking.openURL(GET_YOUR_STORE_URL).catch(() => {});
          },
        }}
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
