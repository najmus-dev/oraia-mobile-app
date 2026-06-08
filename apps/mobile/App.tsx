import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppLoadingScreen } from './src/components/AppLoadingScreen';
import { AppStateProvider } from './src/state/AppState';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <AppLoadingScreen message="Loading fonts…" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <AppNavigator />
        <StatusBar style="light" />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
