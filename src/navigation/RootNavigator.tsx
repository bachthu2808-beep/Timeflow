import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { registerForPushNotifications } from '../lib/pushNotifications';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import OwnerTabs from './OwnerTabs';
import EmployeeTabs from './EmployeeTabs';

export default function RootNavigator() {
  const { session, profile, loading } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);

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
      {!session ? (
        showSignUp ? (
          <SignUpScreen onBackToLogin={() => setShowSignUp(false)} />
        ) : (
          <LoginScreen onSignUp={() => setShowSignUp(true)} />
        )
      ) : profile?.role === 'owner' ? (
        <OwnerTabs />
      ) : (
        <EmployeeTabs />
      )}
    </NavigationContainer>
  );
}
