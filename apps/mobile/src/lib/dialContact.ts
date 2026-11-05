import { Alert, Linking, Platform } from 'react-native';
import { formatPhoneDisplay, toDialablePhone } from './phoneFormat';

export { toDialablePhone } from './phoneFormat';

const LEAD_CONNECTOR_PLAY =
  'https://play.google.com/store/apps/details?id=com.LeadConnector';
const LEAD_CONNECTOR_APP_STORE =
  'https://apps.apple.com/app/lead-connector/id1564302502';
const HIGHLEVEL_PLAY = 'https://play.google.com/store/apps/details?id=com.gohighlevel';

/**
 * HighLevel does not publish an LC Phone / softphone SDK for marketplace apps.
 * Their Conversations "outbound call" API only *logs* a call after the fact —
 * it cannot place a live call from the GHL number.
 *
 * Closest GHL-like UX we can ship:
 * 1) Call with this phone (SIM dialer) — works offline, shows personal caller ID
 * 2) Open LeadConnector / HighLevel for LC Phone (location number + live ringing)
 */
async function openHighLevelCallingApp(): Promise<void> {
  // Prefer launching the installed app; fall back to store (no LC Phone dial deep link exists).
  const launchCandidates =
    Platform.OS === 'ios'
      ? ['leadconnector://', 'gohighlevel://']
      : [
          'intent:#Intent;package=com.LeadConnector;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end',
          'intent:#Intent;package=com.gohighlevel;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end',
        ];
  const storeFallback =
    Platform.OS === 'ios' ? LEAD_CONNECTOR_APP_STORE : LEAD_CONNECTOR_PLAY;

  for (const url of launchCandidates) {
    try {
      if (Platform.OS === 'ios') {
        const can = await Linking.canOpenURL(url);
        if (!can) continue;
      }
      await Linking.openURL(url);
      return;
    } catch {
      /* try next */
    }
  }

  try {
    await Linking.openURL(storeFallback);
  } catch {
    try {
      await Linking.openURL(Platform.OS === 'ios' ? LEAD_CONNECTOR_APP_STORE : HIGHLEVEL_PLAY);
    } catch {
      Alert.alert(
        'HighLevel app',
        'Install LeadConnector or HighLevel from the app store to place calls with your GHL location number (LC Phone).',
      );
    }
  }
}

async function dialWithSim(phone: string): Promise<void> {
  const dialable = toDialablePhone(phone);
  if (!dialable) {
    Alert.alert('Call', 'No phone number on file for this contact.');
    return;
  }
  try {
    await Linking.openURL(`tel:${dialable}`);
  } catch {
    Alert.alert('Call', 'Could not open the phone dialer on this device.');
  }
}

/**
 * GHL-style call chooser: softphone lives in HighLevel; SIM dial is available here.
 */
export function presentCallContact(
  phone: string,
  opts?: { contactName?: string },
): void {
  const dialable = toDialablePhone(phone);
  if (!dialable) {
    Alert.alert(
      'Call',
      'No phone number on file for this contact.\n\nTo call from your GHL location number, open the HighLevel / LeadConnector app (LC Phone).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open HighLevel',
          onPress: () => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            openHighLevelCallingApp();
          },
        },
      ],
    );
    return;
  }

  const display = formatPhoneDisplay(dialable.replace(/^\+/, '')) || dialable;
  const who = opts?.contactName?.trim();
  const title = who ? `Call ${who}` : 'Call';
  const message =
    `${display}\n\n` +
    'Like HighLevel:\n' +
    '• LC Phone (GHL number + live ringing) → HighLevel / LeadConnector app\n' +
    '• This phone’s SIM → Oraia can dial now (shows your personal caller ID)';

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Open HighLevel',
      onPress: () => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        openHighLevelCallingApp();
      },
    },
    {
      text: 'Call with this phone',
      onPress: () => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        dialWithSim(dialable);
      },
    },
  ]);
}

/** @deprecated Prefer presentCallContact for GHL-like UX */
export async function dialContactPhone(phone: string): Promise<void> {
  presentCallContact(phone);
}
