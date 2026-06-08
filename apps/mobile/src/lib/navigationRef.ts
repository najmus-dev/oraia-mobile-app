import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToConversationFromPush(params: {
  conversationId: string;
  contactId?: string;
}): void {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate(
    'Main' as never,
    {
      screen: 'InboxTab',
      params: {
        screen: 'ConversationThread',
        params: {
          conversationId: params.conversationId,
          contactId: params.contactId,
        },
      },
    } as never,
  );
}
