import { Redirect } from 'expo-router';
import { AuthStore } from '@/store/auth';

export default function Index() {
  return <Redirect href={AuthStore.getToken() ? '/(tabs)' : '/(auth)/login'} />;
}
