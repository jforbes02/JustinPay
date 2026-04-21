import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { AppColors } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ThemedText type="title">Dashboard</ThemedText>
      <ThemedText>Coming soon</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});
