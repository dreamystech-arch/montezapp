import { useCallback, useEffect, useState } from "react";
import { Alert, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { claimInstallReward, createMockWalletTopup, fetchWallet, fetchWalletPayouts, requestWalletPayout } from "@/src/api";
import type { WalletSnapshot } from "@/src/api/types";
import {
  DashboardPageScroll,
  EmptyPanel,
  ErrorPanel,
  LoadingBlock,
  SectionTitle,
  useAsyncData,
} from "@/src/components/dashboards/shared";
import { colors, radius, spacing } from "@/src/theme";

const money = (amount: number) => `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function WalletPage() {
  const loader = useCallback(() => fetchWallet(), []);
  const { state, refresh, refreshing } = useAsyncData<WalletSnapshot>(loader);
  const [topupAmount, setTopupAmount] = useState("100");
  const [referralCode, setReferralCode] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutAddress, setPayoutAddress] = useState("");
  const [payouts, setPayouts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const snapshot = state.status === "ready" ? state.data : null;

  const loadPayouts = useCallback(async () => {
    try { setPayouts(await fetchWalletPayouts()); } catch { setPayouts([]); }
  }, []);

  useEffect(() => { void loadPayouts(); }, [loadPayouts]);

  const perform = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      await refresh();
      await loadPayouts();
    } catch (error: any) {
      Alert.alert("Wallet", error?.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardPageScroll onRefresh={refresh} refreshing={refreshing} testID="customer-page-wallet">
      <SectionTitle>My Wallet</SectionTitle>
      {state.status === "loading" ? <LoadingBlock /> : null}
      {state.status === "error" ? <ErrorPanel error={state.error} onRetry={refresh} testID="customer-wallet-error" /> : null}
      {snapshot ? (
        <>
          <View style={styles.balanceCard}>
            <Text style={styles.eyebrow}>AVAILABLE BALANCE</Text>
            <Text style={styles.balance}>{money(snapshot.balance)}</Text>
            <Text style={[styles.helper, { color: "#FFFFFF" }]}>Minimum withdrawal: {money(snapshot.withdrawMinimum)}</Text>
            {snapshot.mockBalance > 0 ? <Text style={styles.mockNote}>Includes {money(snapshot.mockBalance)} in test credits. Test credits cannot be withdrawn.</Text> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add money</Text>
            {snapshot.mockTopupsEnabled ? (
              <>
                <Text style={styles.helper}>Test recharge only. No payment is taken.</Text>
                <View style={styles.formRow}>
                  <TextInput value={topupAmount} onChangeText={setTopupAmount} keyboardType="decimal-pad" placeholder="Amount in ₹" style={styles.input} />
                  <TouchableOpacity style={styles.button} disabled={busy} onPress={() => perform(async () => {
                    const amount = Number(topupAmount);
                    if (!Number.isFinite(amount) || amount < 100) throw new Error("Enter at least ₹100.");
                    await createMockWalletTopup(amount);
                  })}>
                    <Text style={styles.buttonText}>{busy ? "Please wait…" : "Test recharge"}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : <Text style={styles.helper}>Online recharge will be available after a payment provider is connected.</Text>}
          </View>

          <View style={styles.card}>
            <View style={styles.titleRow}>
              <View><Text style={styles.cardTitle}>Invite friends</Text><Text style={styles.helper}>You and a new customer each receive ₹50 after a successful install and sign-up.</Text></View>
            </View>
            <View style={styles.codeBox}><Text style={styles.codeLabel}>YOUR CODE</Text><Text style={styles.code}>{snapshot.referralCode}</Text></View>
            <TouchableOpacity style={styles.outlineButton} onPress={() => Share.share({ message: `Join Montez with my referral link: ${snapshot.referralLink}` })}>
              <Ionicons name="share-social-outline" size={17} color={colors.brand} /><Text style={styles.outlineButtonText}>Share Play Store link</Text>
            </TouchableOpacity>
            {snapshot.mockTopupsEnabled ? <>
              <Text style={[styles.helper, { marginTop: spacing.md }]}>Test install rewards: enter a friend’s code, or leave it blank for a direct install.</Text>
              <TextInput value={referralCode} onChangeText={setReferralCode} autoCapitalize="characters" placeholder="Test referral code (optional)" style={styles.input} />
              <TouchableOpacity style={styles.button} disabled={busy} onPress={() => perform(async () => {
                const result = await claimInstallReward(referralCode, undefined, true);
                if (result.message) Alert.alert("Referral", result.message);
                else if (result.alreadyClaimed) Alert.alert("Referral", "This account has already claimed its install reward.");
                setReferralCode("");
              })}>
                <Text style={styles.buttonText}>Test install reward</Text>
              </TouchableOpacity>
            </> : null}
            <Text style={styles.helper}>Successful referrals: {snapshot.successfulReferrals}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Request a withdrawal</Text>
            <Text style={styles.helper}>Available after your withdrawable balance reaches {money(snapshot.withdrawMinimum)}. Payouts are reviewed by the Montez team.</Text>
            <TextInput value={payoutAmount} onChangeText={setPayoutAmount} keyboardType="decimal-pad" placeholder="Amount in ₹" style={styles.input} />
            <TextInput value={payoutAddress} onChangeText={setPayoutAddress} autoCapitalize="none" placeholder="UPI ID or payout contact" style={styles.input} />
            <TouchableOpacity
              style={[styles.button, snapshot.withdrawableBalance < snapshot.withdrawMinimum && styles.disabledButton]}
              disabled={busy || snapshot.withdrawableBalance < snapshot.withdrawMinimum}
              onPress={() => perform(async () => {
                const amount = Number(payoutAmount);
                if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid payout amount.");
                await requestWalletPayout(amount, payoutAddress);
                setPayoutAmount("");
                setPayoutAddress("");
                Alert.alert("Request sent", "Your payout request is waiting for admin review.");
              })}
            >
              <Text style={styles.buttonText}>Request payout</Text>
            </TouchableOpacity>
            {payouts.length > 0 ? <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Text style={styles.cardTitle}>Your payout requests</Text>
              {payouts.slice(0, 10).map((payout) => <View key={payout.id} style={styles.payoutRow}>
                <Text style={styles.transactionTitle}>{money(payout.amountPaise / 100)}</Text>
                <Text style={styles.transactionMeta}>{payout.status} · {new Date(payout.createdAt).toLocaleDateString()}</Text>
              </View>)}
            </View> : null}
          </View>

          <SectionTitle>Recent transactions</SectionTitle>
          {snapshot.transactions.length === 0 ? <EmptyPanel icon="receipt-outline" title="No transactions yet" hint="Wallet activity will appear here." testID="customer-wallet-empty" /> :
            snapshot.transactions.map((tx) => (
              <View key={tx.id} style={styles.transaction}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.transactionTitle}>{tx.description}</Text>
                  <Text style={styles.transactionMeta}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                  {tx.mock ? <Text style={styles.mockTag}>TEST</Text> : null}
                </View>
                <Text style={[styles.transactionAmount, tx.amount < 0 && styles.debit]}>{tx.amount >= 0 ? "+" : "−"}{money(Math.abs(tx.amount))}</Text>
              </View>
            ))}
        </>
      ) : null}
    </DashboardPageScroll>
  );
}

const styles = StyleSheet.create({
  balanceCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: radius.lg, backgroundColor: colors.brand, padding: spacing.lg },
  eyebrow: { color: "#FFFFFFB3", fontSize: 11, letterSpacing: 1.1, fontWeight: "600" },
  balance: { color: "#FFFFFF", fontSize: 34, fontWeight: "700", marginTop: spacing.xs },
  helper: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  mockNote: { color: "#FFF0C2", fontSize: 12, lineHeight: 17, marginTop: spacing.xs },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  formRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, color: colors.onSurface, marginTop: spacing.sm, flex: 1, backgroundColor: "#FFFFFF" },
  button: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, backgroundColor: colors.brand, paddingHorizontal: spacing.md, marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  disabledButton: { opacity: 0.45 },
  outlineButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.brand, marginTop: spacing.sm },
  outlineButtonText: { color: colors.brand, fontWeight: "600", fontSize: 13 },
  codeBox: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.md },
  codeLabel: { color: colors.onSurfaceSecondary, fontSize: 10, letterSpacing: 1, fontWeight: "600" },
  code: { color: colors.brand, fontSize: 22, fontWeight: "700", marginTop: 2, letterSpacing: 1.2 },
  transaction: { marginHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: spacing.md },
  transactionTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "600" },
  transactionMeta: { color: colors.onSurfaceSecondary, fontSize: 11, marginTop: 3 },
  transactionAmount: { color: colors.success, fontWeight: "600", fontSize: 14 },
  debit: { color: colors.error },
  mockTag: { alignSelf: "flex-start", color: colors.warning, fontSize: 9, fontWeight: "700", marginTop: 3 },
  payoutRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm },
});
