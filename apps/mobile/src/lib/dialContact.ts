import { Alert, Linking } from 'react-native';
import { toDialablePhone } from './phoneFormat';

export { toDialablePhone } from './phoneFormat';

/**
 * Opens the device dialer for a CRM contact number.
 *
 * Oraia does NOT embed HighLevel LC Phone. Call uses the phone's SIM dialer
 * (personal/carrier number). Calling as the GHL location number / live softphone
 * still requires the official HighLevel LC Phone app.
 */
export async function dialContactPhone(phone: string): Promise<void> {
  const dialable = toDialablePhone(phone);
  if (!dialable) {
    Alert.alert(
      'Call',
      'No phone number on file for this contact.\n\nTo call from your GHL location number, use the HighLevel LC Phone app.',
    );
    return;
  }

  // Do not use canOpenURL(tel:) — Android 11+ package visibility often returns false
  // even when the dialer works.
  try {
    await Linking.openURL(`tel:${dialable}`);
  } catch {
    Alert.alert(
      'Call',
      'Could not open the phone dialer.\n\nOraia places calls through your phone SIM, not HighLevel LC Phone. Use the HighLevel app to call from the GHL location number.',
    );
  }
}
