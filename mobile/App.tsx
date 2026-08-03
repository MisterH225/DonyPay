import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RoleProvider } from './src/context/RoleContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <RoleProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </RoleProvider>
    </SafeAreaProvider>
  );
}
