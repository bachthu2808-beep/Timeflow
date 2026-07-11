import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ClockScreen from '../screens/employee/ClockScreen';
import PayslipScreen from '../screens/employee/PayslipScreen';
import HistoryScreen from '../screens/employee/HistoryScreen';
import ScheduleScreen from '../screens/employee/ScheduleScreen';
import ChatScreen from '../screens/employee/ChatScreen';

const Tab = createBottomTabNavigator();

export default function EmployeeTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="Clock" component={ClockScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Payslip" component={PayslipScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
    </Tab.Navigator>
  );
}
