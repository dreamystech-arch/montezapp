import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { submitRFQ } from "@/src/api";
import { colors, font, radius, spacing } from "@/src/theme";

type FormState = {
  name: string;
  email: string;
  phone: string;
  category: string;
  quantity: string;
  description: string;
};

const initial: FormState = {
  name: "",
  email: "",
  phone: "",
  category: "",
  quantity: "",
  description: "",
};

export default function RFQScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ productSlug?: string; category?: string; productName?: string }>();

  const [form, setForm] = useState<FormState>({
    ...initial,
    category: params.category ?? "",
    description: params.productName ? `Interested in: ${params.productName}` : "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const setField = (key: keyof FormState) => (v: string) => {
    setForm((s) => ({ ...s, [key]: v }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Please enter your name";
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email";
    if (!form.quantity.trim()) next.quantity = "Enter quantity";
    if (form.description.trim().length < 5) next.description = "Add more detail (min 5 chars)";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = useCallback(async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSuccess(null);
    try {
      const res = await submitRFQ({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        category: form.category.trim() || undefined,
        quantity: form.quantity.trim(),
        description: form.description.trim(),
        productSlug: params.productSlug,
      });
      setSuccess(`RFQ submitted (ref: ${res.id.slice(0, 8)}). We'll be in touch soon.`);
      setForm(initial);
    } catch (e: any) {
      setSuccess(null);
      setErrors({ description: e?.message ?? "Submission failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }, [form, params.productSlug]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        {params.productSlug ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="rfq-back-button">
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>
        ) : null}
        <View>
          <Text style={styles.title}>Request a Quote</Text>
          <Text style={styles.subtitle}>Get verified quotes from vetted manufacturers</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {success ? (
            <View style={styles.success} testID="rfq-success">
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          <Field label="Full Name *" error={errors.name}>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={form.name}
              onChangeText={setField("name")}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
              testID="rfq-name-input"
            />
          </Field>
          <Field label="Email *" error={errors.email}>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={form.email}
              onChangeText={setField("email")}
              placeholder="you@company.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              testID="rfq-email-input"
            />
          </Field>
          <Field label="Phone">
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={setField("phone")}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              testID="rfq-phone-input"
            />
          </Field>
          <Field label="Product Category">
            <TextInput
              style={styles.input}
              value={form.category}
              onChangeText={setField("category")}
              placeholder="e.g. t-shirts, packaging"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              testID="rfq-category-input"
            />
          </Field>
          <Field label="Quantity *" error={errors.quantity}>
            <TextInput
              style={[styles.input, errors.quantity && styles.inputError]}
              value={form.quantity}
              onChangeText={setField("quantity")}
              placeholder="e.g. 500 units"
              placeholderTextColor={colors.muted}
              testID="rfq-quantity-input"
            />
          </Field>
          <Field label="Description / Specs *" error={errors.description}>
            <TextInput
              style={[styles.input, styles.textarea, errors.description && styles.inputError]}
              value={form.description}
              onChangeText={setField("description")}
              placeholder="Sizes, materials, branding, timeline…"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
              testID="rfq-description-input"
            />
          </Field>

          <TouchableOpacity
            style={[styles.cta, submitting && { opacity: 0.7 }]}
            onPress={onSubmit}
            disabled={submitting}
            activeOpacity={0.85}
            testID="rfq-submit-button"
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaText}>Submit Request</Text>
            )}
          </TouchableOpacity>
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
  },
  title: { fontSize: font.xxl, color: colors.onSurface, fontWeight: "500" },
  subtitle: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  form: { padding: spacing.lg, paddingTop: spacing.sm },
  label: { fontSize: font.sm, color: colors.onSurfaceSecondary, marginBottom: spacing.xs, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: font.base,
    color: colors.onSurface,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.error },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  errorText: { color: colors.error, fontSize: font.sm, marginTop: spacing.xs },
  cta: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.md,
  },
  ctaText: { color: "#FFFFFF", fontSize: font.lg, fontWeight: "500" },
  success: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#ECFDF5",
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  successText: { color: colors.success, flex: 1, fontSize: font.base, fontWeight: "500" },
});
