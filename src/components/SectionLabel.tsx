import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, typography } from '../theme';

export default function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.text}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: { ...typography.sectionLabel, color: colors.textMuted },
});
