import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LocationSelectSheet } from '../components/LocationSelectSheet';
import { useAppState } from '../state/AppState';
import { theme } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LocationPicker'>;

export function LocationPickerScreen(_props: Props) {
  const { clearSession } = useAppState();

  return (
    <View style={styles.container}>
      <LocationSelectSheet visible required onClose={clearSession} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.shell,
  },
});
