import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import ChatListScreen, { ChatStackParamList } from '../screens/owner/ChatListScreen';
import ChatThreadScreen from '../screens/shared/ChatThreadScreen';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator<ChatStackParamList>();

export default function OwnerChatStack() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  return (
    <Stack.Navigator>
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: t('owner.chatList.staffTitle') }} />
      <Stack.Screen name="ChatThread" options={({ route }) => ({ title: route.params.staffName })}>
        {({ route }) =>
          profile ? <ChatThreadScreen ownerId={profile.id} staffId={route.params.staffId} /> : null
        }
      </Stack.Screen>
    </Stack.Navigator>
  );
}
