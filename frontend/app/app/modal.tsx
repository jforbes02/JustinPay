import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <ThemedText type="title">Modal</ThemedText>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
