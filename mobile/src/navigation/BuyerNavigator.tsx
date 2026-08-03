import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BuyerHomeScreen } from '../screens/buyer/BuyerHomeScreen';
import { BuyerPaymentsScreen } from '../screens/buyer/BuyerPaymentsScreen';

export type BuyerTabParamList = {
  BuyerHome: undefined;
  BuyerPayments: undefined;
};

const Tab = createBottomTabNavigator<BuyerTabParamList>();

export function BuyerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0B3D5C',
      }}
    >
      <Tab.Screen
        name="BuyerHome"
        component={BuyerHomeScreen}
        options={{ title: 'Accueil' }}
      />
      <Tab.Screen
        name="BuyerPayments"
        component={BuyerPaymentsScreen}
        options={{ title: 'Paiements' }}
      />
    </Tab.Navigator>
  );
}
