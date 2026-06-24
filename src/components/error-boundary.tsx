import { Component } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg = this.state.error?.message ?? 'Unknown error';
    const mailto = `mailto:daeimoshtaba@gmail.com?subject=${encodeURIComponent('Kondor crash report')}&body=${encodeURIComponent(msg)}`;

    return (
      <View style={styles.root}>
        <ThemedText type="title" style={styles.emoji}>
          💥
        </ThemedText>
        <ThemedText type="title" style={styles.heading}>
          Something went wrong
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.msg}>
          {msg}
        </ThemedText>
        <Pressable style={styles.btn} onPress={this.reset}>
          <ThemedText type="smallBold" style={styles.btnText}>Try again</ThemedText>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(mailto)}>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.report}>
            Report this issue
          </ThemedText>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emoji: { fontSize: 48 },
  heading: { textAlign: 'center' },
  msg: { textAlign: 'center' },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    backgroundColor: '#208AEF',
  },
  btnText: { color: '#fff' },
  report: { textDecorationLine: 'underline' },
});
