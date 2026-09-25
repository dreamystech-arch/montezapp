import { useCallback, useState } from "react";
import { Alert, Platform } from "react-native";
import { useRouter } from "expo-router";

import { useApp } from "@/src/context/AppContext";
import { useCart } from "@/src/context/CartContext";
import { useToast } from "@/src/context/ToastContext";

type AddArgs = { productId?: string; slug?: string; name?: string; quantity?: number };

/** Shared handler used by Product Card & Product Detail's "Add to Cart" buttons.
 * - Prompts sign-in when the user is not authenticated (does not fail silently).
 * - Calls the existing CartContext.addToCart (same code path the Cart tab uses).
 * - Surfaces a lightweight success toast + tracks pending state for button UI.
 */
export function useAddToCartAction() {
  const router = useRouter();
  const { user } = useApp();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const isPending = useCallback(
    (key?: string) => (key ? pendingKey === key : pendingKey !== null),
    [pendingKey],
  );

  const promptSignIn = useCallback(() => {
    // react-native-web makes Alert.alert a no-op, so we can't rely on the
    // native modal there — surface an in-app toast and route to the Account
    // tab where the user can sign in. On native we keep the familiar Alert.
    if (Platform.OS === "web") {
      showToast("Please sign in to add items to your cart", { type: "info", duration: 2400 });
      router.push("/(tabs)/account");
      return;
    }
    Alert.alert(
      "Sign in required",
      "Please sign in to add items to your cart.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Sign in",
          onPress: () => router.push("/(tabs)/account"),
        },
      ],
      { cancelable: true },
    );
  }, [router, showToast]);

  const handleAdd = useCallback(
    async (args: AddArgs) => {
      const key = args.productId ?? args.slug ?? "unknown";
      if (!user) {
        promptSignIn();
        return;
      }
      if (pendingKey) return; // avoid double taps
      setPendingKey(key);
      try {
        await addToCart({
          productId: args.productId,
          slug: args.slug,
          quantity: args.quantity ?? 1,
        });
        showToast(
          args.name ? `${args.name} added to cart` : "Added to cart",
          { type: "success" },
        );
      } catch (e: any) {
        const msg = typeof e?.message === "string" ? e.message : "Could not add to cart";
        // If the upstream returned an auth error, escalate to sign-in prompt.
        if (/401|403|not.?signed|sign.?in|unauth/i.test(msg)) {
          promptSignIn();
        } else {
          showToast(msg, { type: "error", duration: 2600 });
        }
      } finally {
        setPendingKey(null);
      }
    },
    [user, pendingKey, addToCart, showToast, promptSignIn],
  );

  return { addToCart: handleAdd, isPending };
}
