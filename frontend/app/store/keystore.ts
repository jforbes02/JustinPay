import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.justinpay.privatekey';

export const KeyStore = {
  /**
   * Saves the private key to the device's secure enclave.
   * Requires biometric authentication on retrieval.
   */
  save: async (privateKey: string): Promise<void> => {
    await Keychain.setGenericPassword('wallet', privateKey, {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    });
  },

  /**
   * Retrieves the private key. Prompts biometrics if enrolled.
   * Returns null if no key is stored or auth fails.
   */
  get: async (): Promise<string | null> => {
    const result = await Keychain.getGenericPassword({
      service: SERVICE,
      authenticationPrompt: {
        title: 'Confirm your identity',
        subtitle: 'Required to sign transactions',
        cancel: 'Cancel',
      },
    });
    if (!result) return null;
    return result.password;
  },

  /**
   * Deletes the stored private key. Call on logout or wallet removal.
   */
  delete: async (): Promise<void> => {
    await Keychain.resetGenericPassword({ service: SERVICE });
  },

  /**
   * Returns true if a private key is currently stored.
   */
  exists: async (): Promise<boolean> => {
    const result = await Keychain.getGenericPassword({ service: SERVICE });
    return result !== false;
  },
};
