import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  values: number[]; // one entry per day-of-month, day 1..N
  todayIndex: number; // index of "today" within values, highlighted
}

const BAR_AREA_HEIGHT = 100;
const BAR_WIDTH = 10;
const LABEL_EVERY = 7;

export default function MonthlyBarChart({ values, todayIndex }: Props) {
  const max = Math.max(...values, 1);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {values.map((value, index) => {
        const hasData = value > 0;
        const height = hasData ? Math.max(4, (value / max) * BAR_AREA_HEIGHT) : 2;
        const isToday = index === todayIndex;
        const dayOfMonth = index + 1;
        const showLabel = dayOfMonth === 1 || dayOfMonth % LABEL_EVERY === 0 || isToday;
        return (
          <View key={index} style={styles.column}>
            <View style={styles.barArea}>
              <View
                style={[styles.bar, { height }, isToday ? styles.barToday : hasData ? styles.barPast : styles.barEmpty]}
              />
            </View>
            <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{showLabel ? dayOfMonth : ''}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingRight: 8 },
  column: { width: BAR_WIDTH + 4, alignItems: 'center', gap: 6 },
  barArea: { height: BAR_AREA_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: BAR_WIDTH, borderRadius: 4 },
  barPast: { backgroundColor: '#9AD8B6' },
  barToday: { backgroundColor: colors.brand },
  barEmpty: { backgroundColor: colors.border },
  dayLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  dayLabelToday: { color: colors.brand },
});
