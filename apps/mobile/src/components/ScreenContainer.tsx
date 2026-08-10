import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/lib/colors';

interface Props extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
}

export function ScreenContainer({
  scroll = true,
  padded = true,
  children,
  style,
  ...rest
}: Props) {
  const Wrapper = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Wrapper
        contentContainerStyle={scroll ? [padded && styles.padded, style] : undefined}
        style={!scroll ? [styles.flex, padded && styles.padded, style] : styles.flex}
        {...rest}
      >
        {children}
      </Wrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  padded: { padding: spacing.lg },
});
