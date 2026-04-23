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
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { AuthStore } from '@/store/auth';
import { API } from '@/constants/api';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Invalid credentials');
      }
      const data = await res.json();
      AuthStore.setToken(data.access_token);
      const meRes = await fetch(`${API}/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        AuthStore.setUser(me.id, me.username);
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Login Failed', e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandContainer}>
          <View style={styles.logoMark}>
            <Text style={styles.logoSymbol}>◆</Text>
          </View>
          <Text style={styles.appName}>JustinPay</Text>
          <Text style={styles.tagline}>Ethereum made simple</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color={AppColors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your username"
                placeholderTextColor={AppColors.textSecondary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={AppColors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your password"
                placeholderTextColor={AppColors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={AppColors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?  </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}>Create one</Text>
          </TouchableOpacity>
        </View>
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 48,
  },
  blobTopRight: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: AppColors.primary,
    opacity: 0.07,
    top: -100,
    right: -100,
  },
  blobBottomLeft: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#7C3AED',
    opacity: 0.05,
    bottom: 20,
    left: -70,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoMark: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.borderFocused,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  logoSymbol: {
    color: AppColors.primary,
    fontSize: 28,
  },
  appName: {
    fontSize: 34,
    fontWeight: '700',
    color: AppColors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: AppColors.textSecondary,
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: AppColors.border,
    marginBottom: 28,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: AppColors.textPrimary,
    fontSize: 16,
  },
  eyeBtn: {
    padding: 4,
  },
  button: {
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: AppColors.textSecondary,
    fontSize: 15,
  },
  footerLink: {
    color: AppColors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
});
