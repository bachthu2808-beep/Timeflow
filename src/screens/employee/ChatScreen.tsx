import React from 'react';
import { useAuth } from '../../context/AuthContext';
import ChatThreadScreen from '../shared/ChatThreadScreen';

export default function EmployeeChatScreen() {
  const { profile } = useAuth();
  if (!profile) return null;
  return <ChatThreadScreen ownerId={profile.ownerId} staffId={profile.id} />;
}
