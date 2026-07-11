import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  values: number[]; // 7 values, Mon-Sun
  dayLabels: string[]; // 7 short labels, Mon-Sun
  todayIndex: number;
}

const BAR_AREA_HEIGHT = 120;

export default function WeeklyBarChart({ values, dayLabels, todayIndex }: Props) {
  const max = Math.max(...values, 1);

  return (
    <View style={styles.row}>
      {values.map((value, index) => {
        const hasData = value > 0;
        const height = hasData ? Math.max(6, (value / max) * BAR_AREA_HEIGHT) : 3;
        const isToday = index === todayIndex;
        return (
          <View key={index} style={styles.column}>
            <View style={styles.barArea}>
              <View
                style={[
                  styles.bar,
                  { height },
                  isToday ? styles.barToday : hasData ? styles.barPast : styles.barEmpty,
                ]}
              />
            </View>
            <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{dayLabels[index]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  column: { flex: 1, alignItems: 'center', gap: 6 },
  barArea: { height: BAR_AREA_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6, minWidth: 18 },
  barPast: { backgroundColor: '#9AD8B6' },
  barToday: { backgroundColor: colors.brand },
  barEmpty: { backgroundColor: colors.border },
  dayLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  dayLabelToday: { color: colors.brand },
});
