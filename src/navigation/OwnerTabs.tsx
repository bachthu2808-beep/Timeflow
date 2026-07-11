import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import ShopScreen from '../screens/owner/ShopScreen';
import RosterScreen from '../screens/owner/RosterScreen';
import ApprovalsScreen from '../screens/owner/ApprovalsScreen';
import PayrollRunScreen from '../screens/owner/PayrollRunScreen';
import ScheduleScreen from '../screens/owner/ScheduleScreen';
import AuditLogScreen from '../screens/owner/AuditLogScreen';
import OwnerChatStack from './OwnerChatStack';

const Tab = createBottomTabNavigator();

export default function OwnerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="Dashboard" component={OwnerDashboardScreen} />
      <Tab.Screen name="Shop" component={ShopScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Roster" component={RosterScreen} />
      <Tab.Screen name="Approvals" component={ApprovalsScreen} />
      <Tab.Screen name="Payroll" component={PayrollRunScreen} />
      <Tab.Screen name="Chat" component={OwnerChatStack} options={{ headerShown: false }} />
      <Tab.Screen name="Audit Log" component={AuditLogScreen} />
    </Tab.Navigator>
  );
}
