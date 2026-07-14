import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { registerForPushNotifications } from '../lib/pushNotifications';
import { consumePasswordRecoveryLink } from '../lib/passwordRecovery';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import OwnerTabs from './OwnerTabs';
import EmployeeTabs from './EmployeeTabs';

export default function RootNavigator() {
  const { session, profile, loading, profileLoading } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);
  const [checkingRecoveryLink, setCheckingRecoveryLink] = useState(true);
  const [passwordRecoveryActive, setPasswordRecoveryActive] = useState(false);

  useEffect(() => {
    consumePasswordRecoveryLink().then((consumed) => {
      setPasswordRecoveryActive(consumed);
      setCheckingRecoveryLink(false);
    });
  }, []);

  useEffect(() => {
    if (profile?.id) {
      registerForPushNotifications(profile.id);
    }
  }, [profile?.id]);

  if (checkingRecoveryLink || loading || (session && profileLoading)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  // A password-recovery link grants its own session, so this takes priority
  // over the normal signed-in routing below — otherwise the user would land
  // straight in their dashboard instead of getting to set a new password.
  if (passwordRecoveryActive) {
    return (
      <NavigationContainer>
        <ResetPasswordScreen onDone={() => setPasswordRecoveryActive(false)} />
      </NavigationContainer>
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
