import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { colors, font, radius, shadow, spacing } from "@/src/theme";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, options?: { type?: ToastType; duration?: number }) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -20, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [opacity, translateY]);

  const showToast = useCallback<ToastContextValue["showToast"]>(
    (message, options) => {
      const type: ToastType = options?.type ?? "success";
      const duration = options?.duration ?? 2200;
      idRef.current += 1;
      const id = idRef.current;
      setToast({ id, message, type });

      if (hideTimer.current) clearTimeout(hideTimer.current);

      opacity.setValue(0);
      translateY.setValue(-20);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();

      hideTimer.current = setTimeout(hide, duration);
    },
    [opacity, translateY, hide],
  );

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const iconName =
    toast?.type === "error"
      ? "alert-circle"
      : toast?.type === "info"
      ? "information-circle"
      : "checkmark-circle";
  const bg =
    toast?.type === "error" ? "#B00020" : toast?.type === "info" ? "#1F2937" : colors.brand;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            {
              top: Math.max(insets.top, Platform.OS === "android" ? 12 : 8) + 4,
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.toast, { backgroundColor: bg }]} testID="app-toast">
            <Ionicons name={iconName as any} size={18} color="#FFFFFF" />
            <Text style={styles.text} numberOfLines={2}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail-safe: return a no-op so callers never crash if provider isn't mounted yet.
    return { showToast: () => {} } as ToastContextValue;
  }
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    maxWidth: "88%",
    ...shadow.card,
  },
  text: {
    color: "#FFFFFF",
    fontSize: font.sm,
    fontWeight: "500",
    flexShrink: 1,
  },
});
