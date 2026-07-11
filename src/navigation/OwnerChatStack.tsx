import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChatListScreen, { ChatStackParamList } from '../screens/owner/ChatListScreen';
import ChatThreadScreen from '../screens/shared/ChatThreadScreen';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator<ChatStackParamList>();

export default function OwnerChatStack() {
  const { profile } = useAuth();

  return (
    <Stack.Navigator>
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Staff' }} />
      <Stack.Screen name="ChatThread" options={({ route }) => ({ title: route.params.staffName })}>
        {({ route }) =>
          profile ? <ChatThreadScreen ownerId={profile.id} staffId={route.params.staffId} /> : null
        }
      </Stack.Screen>
    </Stack.Navigator>
  );
}
