import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartScreen } from '../screens/buyer/CartScreen';
import { CheckoutScreen } from '../screens/buyer/CheckoutScreen';
import { MessagesScreen } from '../screens/buyer/MessagesScreen';
import { OrderConfirmationScreen } from '../screens/buyer/OrderConfirmationScreen';
import { ProductDetailScreen } from '../screens/buyer/ProductDetailScreen';
import { ProductListScreen } from '../screens/buyer/ProductListScreen';
import { ProfileScreen } from '../screens/buyer/ProfileScreen';
import { SavingsHomeScreen } from '../screens/buyer/SavingsHomeScreen';
import { ScannerScreen } from '../screens/buyer/ScannerScreen';
import { colors } from '../theme/colors';

export type BuyerTabParamList = {
  Accueil: undefined;
  Epargnes: undefined;
  Scanner: undefined;
  Messages: undefined;
  Profil: undefined;
};

export type BuyerStackParamList = {
  BuyerTabs: NavigatorScreenParams<BuyerTabParamList> | undefined;
  ProductDetail: { productId: string };
  Cart: undefined;
  Checkout: undefined;
  OrderConfirmation: { orderId: string; total: number };
};

const Tab = createBottomTabNavigator<BuyerTabParamList>();
const Stack = createNativeStackNavigator<BuyerStackParamList>();

function QrTabButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.qrWrap} accessibilityLabel="Scanner QR">
      <View style={styles.qrBtn}>
        <Ionicons name="qr-code" size={26} color={colors.white} />
      </View>
      <Text style={styles.qrLabel}>Scanner</Text>
    </Pressable>
  );
}

function BuyerTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          height: 56 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Accueil"
        component={ProductListScreen}
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Epargnes"
        component={SavingsHomeScreen}
        options={{
          title: 'Mes épargnes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{
          title: 'Scanner',
          tabBarButton: (props) => (
            <QrTabButton onPress={props.onPress as () => void} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function BuyerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="BuyerTabs" component={BuyerTabs} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen
        name="OrderConfirmation"
        component={OrderConfirmationScreen}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  qrWrap: {
    top: -18,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  qrBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  qrLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
});
