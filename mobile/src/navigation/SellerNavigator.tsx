import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ConfirmHandoverScreen } from '../screens/seller/ConfirmHandoverScreen';
import { CreateProductScreen } from '../screens/seller/CreateProductScreen';
import { CreateShopScreen } from '../screens/seller/CreateShopScreen';
import { ProductDetailScreen } from '../screens/seller/ProductDetailScreen';
import { ScanQrScreen } from '../screens/seller/ScanQrScreen';
import { SellerCatalogScreen } from '../screens/seller/SellerCatalogScreen';
import { SellerHomeScreen } from '../screens/seller/SellerHomeScreen';
import { SellerPlansScreen } from '../screens/seller/SellerPlansScreen';
import { colors } from '../theme/colors';

export type SellerTabParamList = {
  Accueil: undefined;
  Catalogue: undefined;
  Plans: undefined;
};

export type SellerStackParamList = {
  SellerTabs: NavigatorScreenParams<SellerTabParamList> | undefined;
  CreateShop: undefined;
  CreateProduct: { scannedCode?: string } | undefined;
  ProductDetail: { productId: string };
  ScanQr: { mode?: 'create' | 'lookup' } | undefined;
  ConfirmHandover: { goalId: string };
};

const Tab = createBottomTabNavigator<SellerTabParamList>();
const Stack = createNativeStackNavigator<SellerStackParamList>();

function SellerTabs() {
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
        component={SellerHomeScreen}
        options={{ title: 'Tableau de bord', headerShown: false }}
      />
      <Tab.Screen
        name="Catalogue"
        component={SellerCatalogScreen}
        options={{ title: 'Catalogue', headerShown: false }}
      />
      <Tab.Screen
        name="Plans"
        component={SellerPlansScreen}
        options={{ title: 'Plans', headerShown: false }}
      />
    </Tab.Navigator>
  );
}

export function SellerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="SellerTabs"
        component={SellerTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateShop"
        component={CreateShopScreen}
        options={{ title: 'Créer une boutique' }}
      />
      <Stack.Screen
        name="CreateProduct"
        component={CreateProductScreen}
        options={{ title: 'Nouveau produit' }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'Produit' }}
      />
      <Stack.Screen
        name="ScanQr"
        component={ScanQrScreen}
        options={{ title: 'Scanner', headerShown: false }}
      />
      <Stack.Screen
        name="ConfirmHandover"
        component={ConfirmHandoverScreen}
        options={{ title: 'Remise produit' }}
      />
    </Stack.Navigator>
  );
}
