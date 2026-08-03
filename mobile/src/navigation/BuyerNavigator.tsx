import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BuyerHomeScreen } from '../screens/buyer/BuyerHomeScreen';
import { CreateGoalScreen } from '../screens/buyer/CreateGoalScreen';
import { GoalDetailScreen } from '../screens/buyer/GoalDetailScreen';
import { KycOnboardingScreen } from '../screens/buyer/KycOnboardingScreen';
import { PaymentLinkShareScreen } from '../screens/buyer/PaymentLinkShareScreen';
import { TransactionsScreen } from '../screens/buyer/TransactionsScreen';
import { colors } from '../theme/colors';

export type BuyerTabParamList = {
  Accueil: undefined;
  Historique: undefined;
  KYC: undefined;
};

export type BuyerStackParamList = {
  BuyerTabs: NavigatorScreenParams<BuyerTabParamList> | undefined;
  CreateGoal: { productId?: string } | undefined;
  GoalDetail: { goalId: string };
  PaymentLinkShare: {
    installmentId: string;
    goalId: string;
    amount: string;
    productName?: string;
  };
  KycOnboarding: undefined;
};

const Tab = createBottomTabNavigator<BuyerTabParamList>();
const Stack = createNativeStackNavigator<BuyerStackParamList>();

function BuyerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tab.Screen
        name="Accueil"
        component={BuyerHomeScreen}
        options={{ title: 'Épargne', headerShown: false }}
      />
      <Tab.Screen
        name="Historique"
        component={TransactionsScreen}
        options={{ title: 'Historique', headerShown: false }}
      />
      <Tab.Screen
        name="KYC"
        component={KycOnboardingScreen}
        options={{ title: 'Identité', headerShown: false }}
      />
    </Tab.Navigator>
  );
}

export function BuyerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="BuyerTabs"
        component={BuyerTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateGoal"
        component={CreateGoalScreen}
        options={{ title: 'Nouvel objectif' }}
      />
      <Stack.Screen
        name="GoalDetail"
        component={GoalDetailScreen}
        options={{ title: 'Objectif' }}
      />
      <Stack.Screen
        name="PaymentLinkShare"
        component={PaymentLinkShareScreen}
        options={{ title: 'Lien de paiement' }}
      />
      <Stack.Screen
        name="KycOnboarding"
        component={KycOnboardingScreen}
        options={{ title: 'Vérification KYC' }}
      />
    </Stack.Navigator>
  );
}
