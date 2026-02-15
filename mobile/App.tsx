import 'react-native-gesture-handler';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { MarketProvider } from './src/context/MarketContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MarketProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </MarketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
