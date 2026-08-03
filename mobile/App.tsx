import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CartProvider } from './src/context/CartContext';
import { RoleProvider } from './src/context/RoleContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <RoleProvider>
        <CartProvider>
          <RootNavigator />
          <StatusBar style="dark" />
        </CartProvider>
      </RoleProvider>
    </SafeAreaProvider>
  );
}
