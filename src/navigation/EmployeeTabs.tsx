import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import ClockScreen from '../screens/employee/ClockScreen';
import PayslipScreen from '../screens/employee/PayslipScreen';
import HistoryScreen from '../screens/employee/HistoryScreen';
import ScheduleScreen from '../screens/employee/ScheduleScreen';
import ChatScreen from '../screens/employee/ChatScreen';
import LanguageToggle from '../components/LanguageToggle';

const Tab = createBottomTabNavigator();

export default function EmployeeTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerRight: () => <LanguageToggle />,
        tabBarItemStyle: { paddingHorizontal: 1 },
        tabBarLabel: ({ color, children }) => (
          <Text numberOfLines={2} style={{ fontSize: 9, lineHeight: 11, color, textAlign: 'center' }}>
            {children}
          </Text>
        ),
      }}
    >
      <Tab.Screen name="Clock" component={ClockScreen} options={{ title: t('nav.employee.clock') }} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: t('nav.employee.schedule') }} />
      <Tab.Screen name="Payslip" component={PayslipScreen} options={{ title: t('nav.employee.payslip') }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: t('nav.employee.history') }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: t('nav.employee.chat') }} />
    </Tab.Navigator>
  );
}
