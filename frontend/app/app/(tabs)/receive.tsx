import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { AppColors } from '@/constants/theme';
import { AuthStore } from '@/store/auth';
import { API } from '@/constants/api';
import { useNfc, encodePayload } from '@/hooks/use-nfc';

export default function ReceiveScreen() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const { isAndroid, startHceReceiver, stopHceReceiver } = useNfc();

  const userId = AuthStore.getUserId();

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await fetch(`${API}/wallet`, {
          headers: { Authorization: `Bearer ${AuthStore.getToken()}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAddress(data.address);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, []);

  // Android: activate HCE as soon as we have the address
  useEffect(() => {
    if (!isAndroid || !address || !userId) return;
    startHceReceiver(userId, address);
    return () => stopHceReceiver();
  }, [isAndroid, address, userId]);

  const qrPayload = userId && address ? encodePayload(userId, address) : null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.blobTop} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={AppColors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Receive ETH</Text>
        <Text style={styles.subtitle}>
          {isAndroid ? 'Hold phones together to receive' : 'Show this QR code to receive'}
        </Text>

        {loading ? (
          <ActivityIndicator color={AppColors.primary} size="large" style={{ marginTop: 60 }} />
        ) : isAndroid ? (
          // Android — HCE active, just wait for tap
          <View style={styles.hceCard}>
            <View style={styles.hceIconWrapper}>
              <Ionicons name="radio-outline" size={64} color={AppColors.primary} />
            </View>
            <Text style={styles.hceTitle}>Ready to Receive</Text>
            <Text style={styles.hceSub}>
              Ask the sender to open JustinPay and tap their phone to yours
            </Text>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>NFC Active</Text>
            </View>
          </View>
        ) : (
          // iOS — show QR code
          <View style={styles.qrCard}>
            {qrPayload ? (
              <>
                <QRCode
                  value={qrPayload}
                  size={220}
                  color={AppColors.textPrimary}
                  backgroundColor={AppColors.surface}
                />
                <Text style={styles.qrHint}>Have the sender scan this with their phone</Text>
              </>
            ) : (
              <ActivityIndicator color={AppColors.primary} />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  blobTop: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#7C3AED',
    opacity: 0.05,
    top: -80,
    right: -80,
  },
  header: {
    marginBottom: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: AppColors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    marginBottom: 40,
  },
  hceCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 24,
    padding: 36,
    borderWidth: 1,
    borderColor: AppColors.borderFocused,
    alignItems: 'center',
    gap: 16,
  },
  hceIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: AppColors.inputBg,
    borderWidth: 1,
    borderColor: AppColors.borderFocused,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  hceTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  hceSub: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 4,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.success,
  },
  activeText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.success,
  },
  qrCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: AppColors.border,
    alignItems: 'center',
    gap: 20,
  },
  qrHint: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
});
