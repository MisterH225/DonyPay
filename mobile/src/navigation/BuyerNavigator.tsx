import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BuyerHomeScreen } from '../screens/buyer/BuyerHomeScreen';
import { BuyerPaymentsScreen } from '../screens/buyer/BuyerPaymentsScreen';
import { colors } from '../theme/colors';

export type BuyerTabParamList = {
  Accueil: undefined;
  Paiements: undefined;
};

const Tab = createBottomTabNavigator<BuyerTabParamList>();

export function BuyerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
        },
      }}
    >
      <Tab.Screen
        name="Accueil"
        component={BuyerHomeScreen}
        options={{ title: 'Accueil' }}
      />
      <Tab.Screen
        name="Paiements"
        component={BuyerPaymentsScreen}
        options={{ title: 'Paiements' }}
      />
    </Tab.Navigator>
  );
}
