import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LocationSelectSheet } from '../components/LocationSelectSheet';
import { useAppState } from '../state/AppState';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LocationPicker'>;

export function LocationPickerScreen(_props: Props) {
  const { clearSession } = useAppState();

  return (
    <LocationSelectSheet
      visible
      required
      presentation="fullscreen"
      onClose={clearSession}
    />
  );
}
