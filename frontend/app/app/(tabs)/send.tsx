import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { ethers } from 'ethers';
import { AppColors } from '@/constants/theme';
import { API } from '@/constants/api';
import { AuthStore } from '@/store/auth';
import { KeyStore } from '@/store/keystore';
import { useNfc, NfcPaymentPayload, decodePayload } from '@/hooks/use-nfc';

function truncateAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function SendScreen() {
  const [receiver, setReceiver] = useState<NfcPaymentPayload | null>(null);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const { isAndroid, readFromPhone, scanning } = useNfc();

  const handleNfcScan = async () => {
    try {
      const payload = await readFromPhone();
      setReceiver(payload);
    } catch (e: any) {
      Alert.alert('Scan Failed', e.message ?? 'Could not read NFC.');
    }
  };

  const handleOpenQrScanner = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to scan QR codes.');
        return;
      }
    }
    setShowScanner(true);
  };

  const handleQrScanned = ({ data }: { data: string }) => {
    try {
      const payload = decodePayload(data);
      setReceiver(payload);
      setShowScanner(false);
    } catch {
      // ignore bad scans, keep scanning
    }
  };

  const handleSend = async () => {
    if (!receiver) {
      Alert.alert('No Receiver', 'Scan the receiver first.');
      return;
    }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid ETH amount.');
      return;
    }

    setSending(true);
    try {
      const token = AuthStore.getToken();
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const paramsRes = await fetch(
        `${API}/wallet/tx-params?to=${receiver.address}&amount=${parsed}`,
        { headers }
      );
      if (!paramsRes.ok) {
        const err = await paramsRes.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Could not fetch transaction parameters');
      }
      const { nonce, gas_price, gas_limit, chain_id, value_wei } = await paramsRes.json();

      const privateKey = await KeyStore.get();
      if (!privateKey) throw new Error('No private key found. Please import your wallet.');

      const wallet = new ethers.Wallet(privateKey);
      const signedTx = await wallet.signTransaction({
        to: receiver.address,
        nonce,
        gasLimit: BigInt(gas_limit),
        gasPrice: BigInt(gas_price),
        value: BigInt(value_wei),
        chainId: BigInt(chain_id),
      });

      const sendRes = await fetch(`${API}/send-crypto`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          receiver_id: receiver.userId,
          amount: parsed,
          signed_tx: signedTx,
        }),
      });
      if (!sendRes.ok) {
        const err = await sendRes.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Transaction failed');
      }
      Alert.alert('Sent!', `${parsed} ETH sent successfully.`, [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Send Failed', e.message ?? 'Something went wrong.');
    } finally {
      setSending(false);
    }
  };

  // iOS QR scanner overlay
  if (showScanner) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleQrScanned}
        />
        <TouchableOpacity
          style={styles.scannerClose}
          onPress={() => setShowScanner(false)}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.scannerHint}>
          <Text style={styles.scannerHintText}>Point at the receiver's QR code</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.blobTop} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={AppColors.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Send ETH</Text>
        <Text style={styles.subtitle}>
          {isAndroid ? "Tap the receiver's phone to pay" : "Scan the receiver's QR code to pay"}
        </Text>

        {/* Scan Button */}
        <TouchableOpacity
          style={[styles.scanBtn, scanning && styles.scanBtnActive]}
          onPress={isAndroid ? handleNfcScan : handleOpenQrScanner}
          disabled={scanning}
          activeOpacity={0.85}
        >
          {scanning ? (
            <>
              <ActivityIndicator color={AppColors.primary} size="large" />
              <Text style={styles.scanBtnText}>Hold phones together...</Text>
              <Text style={styles.scanBtnSub}>Keep phones close</Text>
            </>
          ) : receiver ? (
            <>
              <Ionicons name="checkmark-circle" size={48} color={AppColors.success} />
              <Text style={styles.scanBtnText}>Receiver Found</Text>
              <Text style={styles.scanBtnSub}>{truncateAddress(receiver.address)}</Text>
            </>
          ) : (
            <>
              <Ionicons
                name={isAndroid ? 'radio-outline' : 'qr-code-outline'}
                size={48}
                color={AppColors.primary}
              />
              <Text style={styles.scanBtnText}>
                {isAndroid ? 'Tap to Scan' : 'Scan QR Code'}
              </Text>
              <Text style={styles.scanBtnSub}>
                {isAndroid ? 'Bring phones close together' : 'Point camera at QR code'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Receiver Info */}
        {receiver && (
          <View style={styles.receiverCard}>
            <View style={styles.receiverRow}>
              <Ionicons name="person-circle-outline" size={20} color={AppColors.textSecondary} />
              <Text style={styles.receiverLabel}>User ID</Text>
              <Text style={styles.receiverValue}>#{receiver.userId}</Text>
            </View>
            <View style={[styles.receiverRow, { marginBottom: 0 }]}>
              <Ionicons name="wallet-outline" size={20} color={AppColors.textSecondary} />
              <Text style={styles.receiverLabel}>Address</Text>
              <Text style={styles.receiverValue}>{truncateAddress(receiver.address)}</Text>
            </View>
            <TouchableOpacity onPress={() => setReceiver(null)} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Amount */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.ethPrefix}>Ξ</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.0000"
              placeholderTextColor={AppColors.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <Text style={styles.ethSuffix}>ETH</Text>
          </View>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendBtn, (!receiver || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!receiver || sending}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="arrow-up" size={20} color="#fff" />
              <Text style={styles.sendBtnText}>Send ETH</Text>
            </>
          )}
        </TouchableOpacity>
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
    paddingTop: 60,
    paddingBottom: 48,
  },
  blobTop: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: AppColors.primary,
    opacity: 0.05,
    top: -100,
    left: -80,
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
    marginBottom: 32,
  },
  scanBtn: {
    backgroundColor: AppColors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: AppColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
    marginBottom: 16,
  },
  scanBtnActive: {
    borderColor: AppColors.primary,
  },
  scanBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  scanBtnSub: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  receiverCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    marginBottom: 16,
    gap: 12,
  },
  receiverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  receiverLabel: {
    fontSize: 14,
    color: AppColors.textSecondary,
    flex: 1,
  },
  receiverValue: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  clearBtn: {
    alignSelf: 'flex-end',
  },
  clearBtnText: {
    fontSize: 13,
    color: AppColors.error,
    fontWeight: '600',
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
    marginBottom: 24,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ethPrefix: {
    fontSize: 28,
    color: AppColors.textSecondary,
    fontWeight: '300',
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: AppColors.textPrimary,
    letterSpacing: -0.5,
  },
  ethSuffix: {
    fontSize: 16,
    color: AppColors.textSecondary,
    fontWeight: '600',
  },
  sendBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scannerClose: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerHint: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scannerHintText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
});
