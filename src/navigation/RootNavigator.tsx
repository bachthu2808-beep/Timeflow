import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { registerForPushNotifications } from '../lib/pushNotifications';
import LoginScreen from '../screens/auth/LoginScreen';
import OwnerTabs from './OwnerTabs';
import EmployeeTabs from './EmployeeTabs';

export default function RootNavigator() {
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      registerForPushNotifications(profile.id);
    }
  }, [profile?.id]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!session ? <LoginScreen /> : profile?.role === 'owner' ? <OwnerTabs /> : <EmployeeTabs />}
    </NavigationContainer>
  );
}
