import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import RosterScreen from '../screens/owner/RosterScreen';
import ApprovalsScreen from '../screens/owner/ApprovalsScreen';
import PayrollRunScreen from '../screens/owner/PayrollRunScreen';

const Tab = createBottomTabNavigator();

export default function OwnerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="Dashboard" component={OwnerDashboardScreen} />
      <Tab.Screen name="Roster" component={RosterScreen} />
      <Tab.Screen name="Approvals" component={ApprovalsScreen} />
      <Tab.Screen name="Payroll" component={PayrollRunScreen} />
    </Tab.Navigator>
  );
}
