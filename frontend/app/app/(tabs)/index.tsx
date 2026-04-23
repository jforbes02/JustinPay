import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Clipboard,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { AuthStore } from '@/store/auth';
import { router } from 'expo-router';
import { API } from '@/constants/api';

function truncateAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function truncateHash(hash: string) {
  if (!hash) return '';
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type Transaction = {
  id: number;
  sender_id: number;
  receiver_id: number;
  amount: number;
  status: string;
  time: string;
  tx_hash: string;
};

export default function DashboardScreen() {
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const token = AuthStore.getToken();
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [walletRes, historyRes] = await Promise.all([
        fetch(`${API}/wallet`, { headers }),
        fetch(`${API}/transactions/history`, { headers }),
      ]);

      if (walletRes.ok) {
        const wallet = await walletRes.json();
        setAddress(wallet.address);
        setBalance(wallet.balance);
      }

      if (historyRes.ok) {
        const history = await historyRes.json();
        setTransactions(history);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not fetch wallet data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const copyAddress = () => {
    Clipboard.setString(address);
    Alert.alert('Copied', 'Wallet address copied to clipboard.');
  };

  const currentUserId = AuthStore.getUserId();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.blobTop} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>My Wallet</Text>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.logoMark}>
              <Text style={styles.logoSymbol}>◆</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={async () => {
                await fetch(`${API}/logout`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${AuthStore.getToken()}` },
                }).catch(() => {});
                AuthStore.clear();
                router.replace('/(auth)/login');
              }}
            >
              <Ionicons name="log-out-outline" size={20} color={AppColors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={AppColors.primary} size="large" style={{ marginTop: 80 }} />
        ) : (
          <>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <View style={styles.balanceRow}>
                <Text style={styles.ethSymbol}>Ξ</Text>
                <Text style={styles.balanceAmount}>
                  {balance !== null ? balance.toFixed(6) : '—'}
                </Text>
              </View>
              <Text style={styles.balanceCurrency}>ETH · Ethereum Mainnet</Text>
            </View>

            {/* Wallet Address Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Wallet Address</Text>
              <View style={styles.addressRow}>
                <Text style={styles.addressText}>{truncateAddress(address)}</Text>
                <TouchableOpacity onPress={copyAddress} style={styles.copyBtn}>
                  <Ionicons name="copy-outline" size={18} color={AppColors.accent} />
                </TouchableOpacity>
              </View>
              <Text style={styles.addressFull}>{address}</Text>
            </View>

            {/* NFC Button */}
            <TouchableOpacity
              style={styles.nfcButton}
              activeOpacity={0.85}
              onPress={() => Alert.alert('NFC', 'NFC payments coming soon.')}
            >
              <View style={styles.nfcIconWrapper}>
                <Ionicons name="radio-outline" size={30} color={AppColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nfcTitle}>Tap to Pay</Text>
                <Text style={styles.nfcSubtitle}>Hold your phone near an NFC reader</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={AppColors.textSecondary} />
            </TouchableOpacity>

            {/* Transaction History */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
            </View>

            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={36} color={AppColors.textSecondary} />
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            ) : (
              transactions.map((tx) => {
                const isSent = tx.sender_id === currentUserId;
                return (
                  <View key={tx.id} style={styles.txCard}>
                    <View style={[styles.txIcon, isSent ? styles.txIconSent : styles.txIconReceived]}>
                      <Ionicons
                        name={isSent ? 'arrow-up' : 'arrow-down'}
                        size={18}
                        color={isSent ? AppColors.error : AppColors.success}
                      />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txType}>{isSent ? 'Sent' : 'Received'}</Text>
                      <Text style={styles.txHash}>{truncateHash(tx.tx_hash)}</Text>
                    </View>
                    <View style={styles.txRight}>
                      <Text style={[styles.txAmount, isSent ? styles.txAmountSent : styles.txAmountReceived]}>
                        {isSent ? '-' : '+'}{tx.amount.toFixed(6)} ETH
                      </Text>
                      <Text style={styles.txDate}>{formatDate(tx.time)}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 48,
  },
  blobTop: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: AppColors.primary,
    opacity: 0.05,
    top: -140,
    right: -100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerLabel: {
    fontSize: 13,
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: AppColors.textPrimary,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.borderFocused,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  logoSymbol: {
    color: AppColors.primary,
    fontSize: 18,
  },
  balanceCard: {
    backgroundColor: AppColors.primary,
    borderRadius: 22,
    padding: 28,
    marginBottom: 16,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  balanceLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  ethSymbol: {
    fontSize: 32,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 52,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -1,
    lineHeight: 56,
  },
  balanceCurrency: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
    letterSpacing: 0.5,
  },
  copyBtn: {
    padding: 6,
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: 8,
  },
  addressFull: {
    fontSize: 11,
    color: AppColors.textSecondary,
    letterSpacing: 0.3,
  },
  nfcButton: {
    backgroundColor: AppColors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  nfcIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: AppColors.inputBg,
    borderWidth: 1,
    borderColor: AppColors.borderFocused,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nfcTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 3,
  },
  nfcSubtitle: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.textPrimary,
    letterSpacing: -0.2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    color: AppColors.textSecondary,
    fontSize: 15,
  },
  txCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconSent: {
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  txIconReceived: {
    backgroundColor: 'rgba(34,197,94,0.1)',
  },
  txInfo: {
    flex: 1,
  },
  txType: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 3,
  },
  txHash: {
    fontSize: 12,
    color: AppColors.textSecondary,
    letterSpacing: 0.2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  txAmountSent: {
    color: AppColors.error,
  },
  txAmountReceived: {
    color: AppColors.success,
  },
  txDate: {
    fontSize: 11,
    color: AppColors.textSecondary,
  },
});
