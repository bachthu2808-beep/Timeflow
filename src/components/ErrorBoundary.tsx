import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled error in app tree:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>{this.state.error.message}</Text>
            <Pressable style={styles.button} onPress={() => this.setState({ error: null })}>
              <Text style={styles.buttonText}>Try again</Text>
            </Pressable>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  message: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  button: { backgroundColor: colors.brand, borderRadius: radii.sm, paddingVertical: 12, paddingHorizontal: 24, marginTop: spacing.md },
  buttonText: { color: '#fff', fontWeight: '700' },
});
