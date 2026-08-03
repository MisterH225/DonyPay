import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CartProvider } from './src/context/CartContext';
import { RoleProvider } from './src/context/RoleContext';
import { SessionProvider } from './src/context/SessionContext';
import { ShopProvider } from './src/context/ShopContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <RoleProvider>
        <SessionProvider>
          <ShopProvider>
            <CartProvider>
              <RootNavigator />
              <StatusBar style="dark" />
            </CartProvider>
          </ShopProvider>
        </SessionProvider>
      </RoleProvider>
    </SafeAreaProvider>
  );
}
