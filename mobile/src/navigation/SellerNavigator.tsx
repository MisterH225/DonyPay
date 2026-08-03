import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SellerHomeScreen } from '../screens/seller/SellerHomeScreen';
import { SellerCatalogScreen } from '../screens/seller/SellerCatalogScreen';

export type SellerTabParamList = {
  SellerHome: undefined;
  SellerCatalog: undefined;
};

const Tab = createBottomTabNavigator<SellerTabParamList>();

export function SellerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2F4A3A',
      }}
    >
      <Tab.Screen
        name="SellerHome"
        component={SellerHomeScreen}
        options={{ title: 'Accueil' }}
      />
      <Tab.Screen
        name="SellerCatalog"
        component={SellerCatalogScreen}
        options={{ title: 'Catalogue' }}
      />
    </Tab.Navigator>
  );
}
