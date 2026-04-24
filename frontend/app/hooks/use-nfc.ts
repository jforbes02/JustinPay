import { useState } from 'react';
import { Platform, NativeModules } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

export interface NfcPaymentPayload {
  userId: number;
  address: string;
}

const PREFIX = 'justinpay:';

// AID: F0 + "JUSTINPAY" in ASCII — must match apduservice.xml
const SELECT_AID = [
  0x00, 0xa4, 0x04, 0x00, 0x0a,
  0xf0, 0x4a, 0x55, 0x53, 0x54, 0x49, 0x4e, 0x50, 0x41, 0x59,
  0x00,
];
const GET_PAYLOAD = [0x00, 0xca, 0x00, 0x00, 0x00];

export function encodePayload(userId: number | string, address: string): string {
  return `${PREFIX}${userId}:${address}`;
}

export function decodePayload(raw: string): NfcPaymentPayload {
  if (!raw.startsWith(PREFIX)) throw new Error('Not a JustinPay tag.');
  const parts = raw.slice(PREFIX.length).split(':');
  if (parts.length < 2) throw new Error('Malformed NFC payload.');
  const userId = parseInt(parts[0], 10);
  const address = parts.slice(1).join(':');
  if (isNaN(userId) || !address) throw new Error('Malformed NFC payload.');
  return { userId, address };
}

export function useNfc() {
  const [scanning, setScanning] = useState(false);

  // Android only — read from another phone acting as HCE card
  const readFromPhone = async (): Promise<NfcPaymentPayload> => {
    setScanning(true);
    try {
      await NfcManager.start();
      await NfcManager.requestTechnology(NfcTech.IsoDep);

      const selectResp = await NfcManager.isoDepHandler.transceive(SELECT_AID);
      if (selectResp[selectResp.length - 2] !== 0x90) throw new Error('AID selection failed.');

      const dataResp = await NfcManager.isoDepHandler.transceive(GET_PAYLOAD);
      if (dataResp[dataResp.length - 2] !== 0x90) throw new Error('Failed to retrieve payload.');

      const payloadBytes = dataResp.slice(0, -2);
      const text = String.fromCharCode(...payloadBytes);
      return decodePayload(text);
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
      setScanning(false);
    }
  };

  // Android only — make this phone act as an NFC card (HCE)
  const startHceReceiver = (userId: number | string, address: string) => {
    if (!NativeModules.NfcPayload) return;
    NativeModules.NfcPayload.setPayload(encodePayload(userId, address));
  };

  const stopHceReceiver = () => {
    if (!NativeModules.NfcPayload) return;
    NativeModules.NfcPayload.clearPayload();
  };

  // Fallback for NFC sticker read (both platforms)
  const readPaymentTag = async (): Promise<NfcPaymentPayload> => {
    setScanning(true);
    try {
      await NfcManager.start();
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      const record = tag?.ndefMessage?.[0];
      if (!record) throw new Error('No NDEF record found on tag.');
      const text = Ndef.text.decodePayload(record.payload as any);
      return decodePayload(text);
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
      setScanning(false);
    }
  };

  // Fallback for NFC sticker write (both platforms)
  const writeToTag = async (userId: number | string, address: string): Promise<void> => {
    setScanning(true);
    try {
      await NfcManager.start();
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const bytes = Ndef.encodeMessage([Ndef.textRecord(encodePayload(userId, address))]);
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
      setScanning(false);
    }
  };

  return {
    isAndroid: Platform.OS === 'android',
    readFromPhone,
    startHceReceiver,
    stopHceReceiver,
    readPaymentTag,
    writeToTag,
    scanning,
  };
}
