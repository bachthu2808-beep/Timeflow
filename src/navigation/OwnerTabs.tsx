import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import ShopScreen from '../screens/owner/ShopScreen';
import RosterScreen from '../screens/owner/RosterScreen';
import ApprovalsScreen from '../screens/owner/ApprovalsScreen';
import PayrollRunScreen from '../screens/owner/PayrollRunScreen';
import ScheduleScreen from '../screens/owner/ScheduleScreen';
import AuditLogScreen from '../screens/owner/AuditLogScreen';
import OwnerChatStack from './OwnerChatStack';
import LanguageToggle from '../components/LanguageToggle';
import ScrollableTabBar from '../components/ScrollableTabBar';
import { usePendingApprovalsCount } from '../hooks/usePendingApprovalsCount';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

export default function OwnerTabs() {
  const { t } = useTranslation();
  const pendingApprovals = usePendingApprovalsCount();

  return (
    <Tab.Navigator
      tabBar={(props) => <ScrollableTabBar {...props} />}
      screenOptions={{ headerShown: true, headerRight: () => <LanguageToggle /> }}
    >
      <Tab.Screen name="Dashboard" component={OwnerDashboardScreen} options={{ title: t('nav.owner.dashboard') }} />
      <Tab.Screen name="Shop" component={ShopScreen} options={{ title: t('nav.owner.shop') }} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: t('nav.owner.schedule') }} />
      <Tab.Screen name="Roster" component={RosterScreen} options={{ title: t('nav.owner.roster') }} />
      <Tab.Screen
        name="Approvals"
        component={ApprovalsScreen}
        options={{
          title: t('nav.owner.approvals'),
          tabBarBadge: pendingApprovals > 0 ? pendingApprovals : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.approvalsBannerAccent },
        }}
      />
      <Tab.Screen name="Payroll" component={PayrollRunScreen} options={{ title: t('nav.owner.payroll') }} />
      <Tab.Screen name="Chat" component={OwnerChatStack} options={{ headerShown: false, title: t('nav.owner.chat') }} />
      <Tab.Screen name="Audit Log" component={AuditLogScreen} options={{ title: t('nav.owner.auditLog') }} />
    </Tab.Navigator>
  );
}
