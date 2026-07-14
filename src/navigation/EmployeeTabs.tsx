import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import ClockScreen from '../screens/employee/ClockScreen';
import PayslipScreen from '../screens/employee/PayslipScreen';
import HistoryScreen from '../screens/employee/HistoryScreen';
import ScheduleScreen from '../screens/employee/ScheduleScreen';
import ChatScreen from '../screens/employee/ChatScreen';
import HeaderActions from '../components/HeaderActions';

const Tab = createBottomTabNavigator();

export default function EmployeeTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator screenOptions={{ headerShown: true, headerRight: () => <HeaderActions /> }}>
      <Tab.Screen name="Clock" component={ClockScreen} options={{ title: t('nav.employee.clock') }} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: t('nav.employee.schedule') }} />
      <Tab.Screen name="Payslip" component={PayslipScreen} options={{ title: t('nav.employee.payslip') }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: t('nav.employee.history') }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: t('nav.employee.chat') }} />
    </Tab.Navigator>
  );
}
