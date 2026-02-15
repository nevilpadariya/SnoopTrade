import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';
import { HomeScreen } from '../screens/home/HomeScreen';
import { StockDetailScreen } from '../screens/home/StockDetailScreen';
import { colors } from '../theme/tokens';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'SnoopTrade' }} />
      <Stack.Screen name="StockDetail" component={StockDetailScreen} options={{ title: 'Stock Detail' }} />
    </Stack.Navigator>
  );
}
