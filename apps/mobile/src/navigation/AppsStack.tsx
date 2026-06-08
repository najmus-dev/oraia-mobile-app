import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppsScreen } from '../screens/AppsScreen';
import { ContactsScreen } from '../screens/ContactsScreen';
import { ContactDetailScreen } from '../screens/ContactDetailScreen';
import { ContactFormScreen } from '../screens/ContactFormScreen';
import { ScanBusinessCardScreen } from '../screens/ScanBusinessCardScreen';
import { PipelineScreen } from '../screens/PipelineScreen';
import { OpportunityDetailScreen } from '../screens/OpportunityDetailScreen';
import { OpportunityFormScreen } from '../screens/OpportunityFormScreen';
import { PickContactScreen } from '../screens/PickContactScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { TaskFormScreen } from '../screens/TaskFormScreen';
import { TaskFilterScreen } from '../screens/TaskFilterScreen';
import { SelectAssigneesScreen } from '../screens/SelectAssigneesScreen';
import type { PickedContact } from '../lib/contacts';
import type { PickContactParams } from '../screens/PickContactScreen';
import type { Task, TaskFilters } from '../lib/tasks';
import { theme } from '../theme';

export type AppsStackParamList = {
  AppsHome: undefined;
  ContactsList: { initialQuery?: string } | undefined;
  ContactDetail: { contactId: string };
  ContactForm: { contactId?: string } | undefined;
  ScanBusinessCard: undefined;
  PipelineHome: undefined;
  OpportunityDetail: { opportunityId: string; title?: string };
  OpportunityForm: {
    pipelineId?: string;
    pipelineStageId?: string;
    pickedContact?: PickedContact;
    pickedAssignee?: { id: string; name: string };
  };
  PickContact: PickContactParams;
  TasksHome: { appliedFilters?: TaskFilters };
  TaskForm: {
    taskId?: string;
    contactId?: string;
    initialTask?: Task;
    fresh?: boolean;
    pickedContact?: PickedContact;
    pickedAssignee?: { id: string; name: string };
  };
  TaskFilters: {
    filters?: TaskFilters;
    pickedAssigneeIds?: string[];
    pickedContactIds?: string[];
  };
  SelectAssignees: {
    mode: 'single' | 'multi';
    selectedIds?: string[];
    returnTo?: 'TaskForm' | 'TaskFilters' | 'OpportunityForm';
    filters?: TaskFilters;
  };
};

const Stack = createNativeStackNavigator<AppsStackParamList>();

export function AppsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.shell },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="AppsHome" component={AppsScreen} />
      <Stack.Screen name="ContactsList" component={ContactsScreen} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} />
      <Stack.Screen name="ContactForm" component={ContactFormScreen} />
      <Stack.Screen name="ScanBusinessCard" component={ScanBusinessCardScreen} />
      <Stack.Screen name="TasksHome" component={TasksScreen} />
      <Stack.Screen
        name="TaskForm"
        component={TaskFormScreen}
        options={{ freezeOnBlur: false }}
      />
      <Stack.Screen name="TaskFilters" component={TaskFilterScreen} />
      <Stack.Screen name="SelectAssignees" component={SelectAssigneesScreen} />
      <Stack.Screen name="PipelineHome" component={PipelineScreen} />
      <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} />
      <Stack.Screen name="PickContact" component={PickContactScreen} />
      <Stack.Screen name="OpportunityForm" component={OpportunityFormScreen} />
    </Stack.Navigator>
  );
}
