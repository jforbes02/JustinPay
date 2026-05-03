/**
 * use-nfc.ts
 *
 * Cross-platform NFC hook for JustinPay phone-to-phone payments.
 *
 * Android:
 *   - Receiver activates Host Card Emulation (HCE) via a native Kotlin service
 *     (HCEPaymentService.kt), making their phone behave like an NFC payment card.
 *   - Sender uses IsoDep to establish a connection and pull the payment payload
 *     (userId + wallet address) directly from the receiver's phone.
 *   - Communication uses a custom AID (F0JUSTINPAY) over APDU commands —
 *     SELECT picks the app, then a GET command returns the payload bytes.
 *
 * iOS:
 *   - Apple does not allow apps to emulate NFC cards (no HCE API).
 *   - Receiver shows a QR code encoding the same payload string.
 *   - Sender scans the QR with the camera (expo-camera).
 *
 * Payload format: "justinpay:<userId>:<walletAddress>"
 * This string is what gets transmitted over NFC or encoded in the QR code.
 */

import { useState } from 'react';
import { Platform, NativeModules } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

export interface NfcPaymentPayload {
  userId: number;
  address: string;
}

const PREFIX = 'justinpay:';

// APDU SELECT command for our custom AID: F0 + "JUSTINPAY" in ASCII hex.
// Must match the AID registered in android/app/src/main/res/xml/apduservice.xml.
const SELECT_AID = [
  0x00, 0xa4, 0x04, 0x00, 0x0a,
  0xf0, 0x4a, 0x55, 0x53, 0x54, 0x49, 0x4e, 0x50, 0x41, 0x59,
  0x00,
];

// APDU GET command — tells HCEPaymentService to return the payload bytes.
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

  /**
   * Android sender — taps the receiver's phone.
   * Opens an IsoDep (ISO 14443-4) channel, selects our AID,
   * then reads the payment payload bytes from the receiver's HCE service.
   */
  const readFromPhone = async (): Promise<NfcPaymentPayload> => {
    setScanning(true);
    try {
      await NfcManager.start();
      await NfcManager.requestTechnology(NfcTech.IsoDep);

      const selectResp = await NfcManager.isoDepHandler.transceive(SELECT_AID);
      if (selectResp[selectResp.length - 2] !== 0x90) throw new Error('AID selection failed.');

      const dataResp = await NfcManager.isoDepHandler.transceive(GET_PAYLOAD);
      if (dataResp[dataResp.length - 2] !== 0x90) throw new Error('Failed to retrieve payload.');

      // Strip the two trailing status bytes (0x90 0x00) to get the raw payload string.
      const payloadBytes = dataResp.slice(0, -2);
      const text = String.fromCharCode(...payloadBytes);
      return decodePayload(text);
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
      setScanning(false);
    }
  };

  /**
   * Android receiver — activates HCE so this phone acts as an NFC card.
   * Writes the payload to SharedPreferences where HCEPaymentService reads it.
   * NfcPayload is a native Kotlin module (NfcPayloadModule.kt) bridged to JS.
   */
  const startHceReceiver = (userId: number | string, address: string) => {
    if (!NativeModules.NfcPayload) return;
    NativeModules.NfcPayload.setPayload(encodePayload(userId, address));
  };

  const stopHceReceiver = () => {
    if (!NativeModules.NfcPayload) return;
    NativeModules.NfcPayload.clearPayload();
  };

  // Fallback: read from a physical NFC sticker (both platforms).
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

  // Fallback: write payment info to a physical NFC sticker (both platforms).
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
