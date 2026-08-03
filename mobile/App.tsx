import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RoleProvider } from './src/context/RoleContext';
import { SessionProvider } from './src/context/SessionContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <RoleProvider>
        <SessionProvider>
          <RootNavigator />
          <StatusBar style="dark" />
        </SessionProvider>
      </RoleProvider>
    </SafeAreaProvider>
  );
}
