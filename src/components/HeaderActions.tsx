import React from 'react';
import { View } from 'react-native';
import LanguageToggle from './LanguageToggle';
import SignOutButton from './SignOutButton';

export default function HeaderActions() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <SignOutButton />
      <LanguageToggle />
    </View>
  );
}
