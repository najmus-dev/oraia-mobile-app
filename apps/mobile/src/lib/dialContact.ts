import { Alert, Linking, Platform } from 'react-native';

/**
 * Opens the device dialer for a CRM contact number.
 * Oraia does not embed HighLevel LC Phone — live softphone / caller-ID from the
 * GHL number still requires the official HighLevel app.
 */
export async function dialContactPhone(phone: string): Promise<void> {
  const trimmed = phone.trim();
  if (!trimmed) {
    Alert.alert('Call', 'No phone number on file.');
    return;
  }

  const url = `tel:${trimmed}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported && Platform.OS === 'ios') {
      Alert.alert('Call', 'Calling is not available on this device.');
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      'Call',
      'Could not open the phone dialer. Check that this device can place calls, or use the HighLevel LC Phone app for the location number.',
    );
  }
}
