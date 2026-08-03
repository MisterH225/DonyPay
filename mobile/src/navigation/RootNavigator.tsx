import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useRole } from '../context/RoleContext';
import { BuyerNavigator } from './BuyerNavigator';
import { SellerNavigator } from './SellerNavigator';

export function RootNavigator() {
  const { role } = useRole();

  return (
    <NavigationContainer>
      {role === 'buyer' ? <BuyerNavigator /> : <SellerNavigator />}
    </NavigationContainer>
  );
}
