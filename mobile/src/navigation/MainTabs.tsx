import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TabParamList } from './types';
import { HomeStack } from './HomeStack';
import { TransactionsScreen } from '../screens/transactions/TransactionsScreen';
import { ForecastScreen } from '../screens/forecast/ForecastScreen';
import { AccountScreen } from '../screens/account/AccountScreen';
import { colors } from '../theme/tokens';

const Tab = createBottomTabNavigator<TabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 70,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            HomeTab: 'home-outline',
            Transactions: 'swap-horizontal-outline',
            Forecast: 'trending-up-outline',
            Account: 'person-outline',
          };

          return <Ionicons name={iconMap[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Home' }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Forecast" component={ForecastScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}
