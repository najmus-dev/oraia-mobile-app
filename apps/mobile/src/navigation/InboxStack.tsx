import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { ConversationThreadScreen } from '../screens/ConversationThreadScreen';
import { InboxPickContactScreen } from '../screens/InboxPickContactScreen';
import { theme } from '../theme';
import type { MessageChannel } from '../lib/conversations';

export type InboxStackParamList = {
  InboxList: undefined;
  PickContactForMessage: { channel: MessageChannel };
  ConversationThread: {
    conversationId?: string;
    contactId?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    channel?: MessageChannel;
    starred?: boolean;
  };
};

const Stack = createNativeStackNavigator<InboxStackParamList>();

export function InboxStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.shell },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="InboxList" component={ConversationsScreen} />
      <Stack.Screen name="PickContactForMessage" component={InboxPickContactScreen} />
      <Stack.Screen name="ConversationThread" component={ConversationThreadScreen} />
    </Stack.Navigator>
  );
}
