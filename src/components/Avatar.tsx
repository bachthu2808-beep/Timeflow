import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { avatarColorFor, initialsFor } from '../lib/avatarColor';
import { radii } from '../theme';

interface Props {
  id: string;
  name: string;
  size?: number;
}

export default function Avatar({ id, name, size = 44 }: Props) {
  const color = avatarColorFor(id);
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size * 0.32, backgroundColor: color.background },
      ]}
    >
      <Text style={[styles.text, { color: color.text, fontSize: size * 0.38 }]}>{initialsFor(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.md },
  text: { fontWeight: '700' },
});
