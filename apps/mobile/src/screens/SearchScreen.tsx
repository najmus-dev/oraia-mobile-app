import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api, withAuthHeaders } from '../lib/api';
import {
  CRM_APPS,
  crmAppAccent,
  crmAppList,
  filterAppsByQuery,
  openCrmApp,
  type CrmAppDef,
} from '../lib/crmApps';
import { contactDisplayName } from '../lib/contacts';
import type { ContactsListResponse } from '../lib/contacts';
import {
  appointmentSearchDetail,
  filterAppointmentsByQuery,
  taskSearchDetail,
  type CalendarSearchEvent,
} from '../lib/appointmentSearch';
import {
  buildConversationsQuery,
  type ConversationsListResponse,
} from '../lib/conversations';
import { endOfDay, startOfDay, toIso } from '../lib/dates';
import { formatError } from '../lib/errors';
import {
  contactSearchDetail,
  GLOBAL_SEARCH_LIMIT,
  mergeGlobalSearchResults,
  opportunitySearchDetail,
  type GlobalSearchResults,
  type SearchScope,
} from '../lib/globalSearch';
import { navigateToAppointmentDetail, navigateToContactDetail, navigateToTabScreen, getTabNavigation } from '../lib/navigation';
import { type OpportunitiesListResponse } from '../lib/opportunities';
import { type TasksSearchResponse } from '../lib/tasks';
import { TAB_LIST_BOTTOM_PADDING, useHeaderTopPadding } from '../lib/safeArea';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import { useAppState } from '../state/AppState';
import type { OraiaTheme } from '../theme';
import { InboxBrandHeader } from '../components/inbox/InboxBrandHeader';
import { LocationSelectSheet } from '../components/LocationSelectSheet';
import type { SearchStackParamList } from '../navigation/SearchStack';

type Props = NativeStackScreenProps<SearchStackParamList, 'SearchMain'>;

export function SearchScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    token,
    locationId,
    locationName,
    locationAddress,
    locationLogoUrl,
    pinnedAppIds,
  } = useAppState();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GlobalSearchResults>({
    apps: [],
    contacts: [],
    conversations: [],
    opportunities: [],
    tasks: [],
    appointments: [],
  });
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const tabNav = getTabNavigation(navigation);
  const headerTop = useHeaderTopPadding();

  const suggestedApps = useMemo(
    () =>
      pinnedAppIds
        .map((id) => CRM_APPS[id as keyof typeof CRM_APPS])
        .filter((app): app is CrmAppDef => Boolean(app?.available)),
    [pinnedAppIds],
  );

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;

  const runSearch = useCallback(async () => {
    if (!token || !locationId || !trimmedQuery) {
      setResults({
        apps: [],
        contacts: [],
        conversations: [],
        opportunities: [],
        tasks: [],
        appointments: [],
      });
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const contactQs = `limit=${GLOBAL_SEARCH_LIMIT}&query=${encodeURIComponent(trimmedQuery)}`;
      const convoQs = buildConversationsQuery({ limit: GLOBAL_SEARCH_LIMIT, query: trimmedQuery });
      const oppQs = `limit=${GLOBAL_SEARCH_LIMIT}&query=${encodeURIComponent(trimmedQuery)}`;
      const searchStart = new Date();
      searchStart.setDate(searchStart.getDate() - 30);
      const searchEnd = new Date();
      searchEnd.setDate(searchEnd.getDate() + 90);
      const eventsQs = `startTime=${encodeURIComponent(toIso(startOfDay(searchStart)))}&endTime=${encodeURIComponent(toIso(endOfDay(searchEnd)))}`;

      const [contactsRes, convosRes, oppsRes, tasksRes, eventsRes] = await Promise.all([
        api.getJson<ContactsListResponse>(`/api/contacts?${contactQs}`, {
          headers: withAuthHeaders({ token, locationId }),
        }),
        api.getJson<ConversationsListResponse>(`/api/conversations?${convoQs}`, {
          headers: withAuthHeaders({ token, locationId }),
        }),
        api.getJson<OpportunitiesListResponse>(`/api/opportunities?${oppQs}`, {
          headers: withAuthHeaders({ token, locationId }),
        }),
        api.postJson<TasksSearchResponse>(
          '/api/tasks/search',
          { query: trimmedQuery, limit: GLOBAL_SEARCH_LIMIT },
          { headers: withAuthHeaders({ token, locationId }) },
        ),
        api.getJson<{ events: CalendarSearchEvent[] }>(`/api/calendar/events?${eventsQs}`, {
          headers: withAuthHeaders({ token, locationId }),
        }),
      ]);

      const matchedAppointments = filterAppointmentsByQuery(eventsRes.events ?? [], trimmedQuery).slice(
        0,
        GLOBAL_SEARCH_LIMIT,
      );

      const partial: GlobalSearchResults = {
        apps: filterAppsByQuery(crmAppList().filter((a) => a.available), trimmedQuery),
        contacts: contactsRes.contacts ?? [],
        conversations: convosRes.conversations ?? [],
        opportunities: oppsRes.opportunities ?? [],
        tasks: tasksRes.tasks ?? [],
        appointments: matchedAppointments,
        contactsTotal: contactsRes.meta?.total,
        conversationsTotal: convosRes.total,
        opportunitiesTotal: oppsRes.meta?.total,
        tasksTotal: tasksRes.tasks?.length,
        appointmentsTotal: matchedAppointments.length,
      };
      setResults(mergeGlobalSearchResults(scope, partial));
    } catch (e) {
      setError(formatError(e));
      setResults({
        apps: [],
        contacts: [],
        conversations: [],
        opportunities: [],
        tasks: [],
        appointments: [],
      });
    } finally {
      setLoading(false);
    }
  }, [token, locationId, trimmedQuery, scope]);

  useEffect(() => {
    if (!isSearching) {
      setResults({
        apps: [],
        contacts: [],
        conversations: [],
        opportunities: [],
        tasks: [],
        appointments: [],
      });
      setError(null);
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      runSearch();
    }, 250);
    return () => clearTimeout(timer);
  }, [isSearching, runSearch]);

  function onSuggestedAppPress(app: CrmAppDef) {
    if (isSearching) {
      setScope((prev) => (prev === app.id ? null : app.id));
      return;
    }
    openCrmApp(app.id, tabNav ?? navigation);
  }

  function openContactsViewMore() {
    navigateToTabScreen(navigation, 'AppsTab', 'ContactsList', { initialQuery: trimmedQuery });
  }

  function openOpportunity(opportunityId: string, title?: string) {
    navigateToTabScreen(navigation, 'AppsTab', 'OpportunityDetail', { opportunityId, title });
  }

  function openConversation(conversationId: string, contactId?: string, contactName?: string) {
    navigateToTabScreen(navigation, 'InboxTab', 'ConversationThread', {
      conversationId,
      contactId,
      contactName,
    });
  }

  function openTask(task: (typeof results.tasks)[number]) {
    if (!task.contactId?.trim()) {
      navigateToTabScreen(navigation, 'AppsTab', 'TasksHome');
      return;
    }
    navigateToTabScreen(navigation, 'AppsTab', 'TaskForm', {
      taskId: task.id,
      contactId: task.contactId,
      initialTask: task,
    });
  }

  const scopeLabel = scope ? CRM_APPS[scope]?.label : null;
  const hasResults =
    results.apps.length > 0 ||
    results.contacts.length > 0 ||
    results.conversations.length > 0 ||
    results.opportunities.length > 0 ||
    results.tasks.length > 0 ||
    results.appointments.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <InboxBrandHeader
          locationName={locationName}
          locationAddress={locationAddress}
          locationLogoUrl={locationLogoUrl}
          onOpenLocation={() => setLocationSheetOpen(true)}
        />
        <Pressable
          style={[styles.settingsBtn, { top: headerTop }]}
          hitSlop={8}
          onPress={() =>
            parentNav?.navigate('HomeTab' as never, { screen: 'Settings' } as never)
          }
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={20} color={theme.colors.white} />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={theme.colors.foregroundMuted} />
        <TextInput
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (!text.trim()) setScope(null);
          }}
          placeholder="Search across all Apps"
          placeholderTextColor={theme.colors.inputPlaceholder}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => {
              setQuery('');
              setScope(null);
            }}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={20} color={theme.colors.foregroundMuted} />
          </Pressable>
        ) : null}
      </View>

      {scopeLabel ? (
        <View style={styles.scopeRow}>
          <Text style={styles.scopeText}>Searching in {scopeLabel}</Text>
          <Pressable onPress={() => setScope(null)} hitSlop={8}>
            <Ionicons name="close" size={16} color={theme.colors.link} />
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: TAB_LIST_BOTTOM_PADDING }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {isSearching ? 'Filter by App' : 'Suggested Apps'}
          </Text>
          <View style={styles.suggestedRow}>
            {suggestedApps.map((app) => {
              const scoped = scope === app.id;
              const accent = crmAppAccent(app, theme);
              return (
                <Pressable
                  key={app.id}
                  style={styles.suggestedItem}
                  onPress={() => onSuggestedAppPress(app)}
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.suggestedCircle,
                      { borderColor: `${accent}55` },
                      scoped && styles.suggestedCircleActive,
                    ]}
                  >
                    <Ionicons name={app.icon} size={22} color={accent} />
                  </View>
                  <Text style={styles.suggestedLabel} numberOfLines={1}>
                    {app.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {suggestedApps.length === 0 ? (
            <Text style={styles.emptyHint}>Pin apps from Home to show suggestions here.</Text>
          ) : null}
        </View>

        {isSearching && loading ? (
          <ActivityIndicator color={theme.colors.secondary} style={styles.loader} />
        ) : null}

        {isSearching && error ? <Text style={styles.errorText}>{error}</Text> : null}

        {isSearching && !loading && !error && !hasResults ? (
          <Text style={styles.emptyHint}>No results for &quot;{trimmedQuery}&quot;.</Text>
        ) : null}

        {isSearching && results.apps.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Apps</Text>
            <View style={styles.appsRow}>
              {results.apps.map((app) => {
                const accent = crmAppAccent(app, theme);
                return (
                <Pressable
                  key={app.id}
                  style={styles.suggestedItem}
                  onPress={() => openCrmApp(app.id, parentNav ?? undefined)}
                  accessibilityRole="button"
                >
                  <View style={[styles.suggestedCircle, { borderColor: `${accent}55` }]}>
                    <Ionicons name={app.icon} size={22} color={accent} />
                  </View>
                  <Text style={styles.suggestedLabel} numberOfLines={1}>
                    {app.label}
                  </Text>
                </Pressable>
              );
              })}
            </View>
          </View>
        ) : null}

        {isSearching && results.contacts.length > 0 ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Contacts</Text>
              <Pressable onPress={openContactsViewMore} hitSlop={8}>
                <Text style={styles.viewMore}>View More</Text>
              </Pressable>
            </View>
            <View style={styles.resultList}>
              {results.contacts.map((contact) => {
                const detail = contactSearchDetail(contact);
                return (
                  <Pressable
                    key={contact.id}
                    style={styles.resultRow}
                    onPress={() => navigateToContactDetail(navigation, contact.id)}
                  >
                    <View style={styles.resultIconWrap}>
                      <Ionicons name="person-outline" size={18} color={theme.colors.link} />
                    </View>
                    <View style={styles.resultTextCol}>
                      <Text style={styles.resultTitle}>{contactDisplayName(contact)}</Text>
                      {detail ? (
                        <Text style={styles.resultSubtitle} numberOfLines={1}>
                          {detail}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {isSearching && results.conversations.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Conversations</Text>
            <View style={styles.resultList}>
              {results.conversations.map((convo) => (
                <Pressable
                  key={convo.id}
                  style={styles.resultRow}
                  onPress={() =>
                    openConversation(convo.id, convo.contactId, convo.contactName)
                  }
                >
                  <View style={styles.resultIconWrap}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={18}
                      color={theme.colors.link}
                    />
                  </View>
                  <View style={styles.resultTextCol}>
                    <Text style={styles.resultTitle}>
                      {convo.contactName?.trim() || 'Conversation'}
                    </Text>
                    {convo.lastMessageBody ? (
                      <Text style={styles.resultSubtitle} numberOfLines={1}>
                        {convo.lastMessageBody}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {isSearching && results.opportunities.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Opportunities</Text>
            <View style={styles.resultList}>
              {results.opportunities.map((opp) => {
                const detail = opportunitySearchDetail(opp);
                return (
                  <Pressable
                    key={opp.id}
                    style={styles.resultRow}
                    onPress={() => openOpportunity(opp.id, opp.name)}
                  >
                    <View style={styles.resultIconWrap}>
                      <Ionicons name="git-network-outline" size={18} color={theme.colors.link} />
                    </View>
                    <View style={styles.resultTextCol}>
                      <Text style={styles.resultTitle}>{opp.name?.trim() || 'Opportunity'}</Text>
                      {detail ? (
                        <Text style={styles.resultSubtitle} numberOfLines={1}>
                          {detail}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {isSearching && results.tasks.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tasks</Text>
            <View style={styles.resultList}>
              {results.tasks.map((task) => {
                const detail = taskSearchDetail(task);
                return (
                  <Pressable
                    key={task.id}
                    style={styles.resultRow}
                    onPress={() => openTask(task)}
                  >
                    <View style={styles.resultIconWrap}>
                      <Ionicons name="checkbox-outline" size={18} color={theme.colors.link} />
                    </View>
                    <View style={styles.resultTextCol}>
                      <Text style={styles.resultTitle}>{task.title?.trim() || 'Task'}</Text>
                      {detail ? (
                        <Text style={styles.resultSubtitle} numberOfLines={1}>
                          {detail}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {isSearching && results.appointments.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Appointments</Text>
            <View style={styles.resultList}>
              {results.appointments.map((event) => {
                const detail = appointmentSearchDetail(event);
                return (
                  <Pressable
                    key={event.id}
                    style={styles.resultRow}
                    onPress={() =>
                      navigateToAppointmentDetail(navigation, event.id, event.title)
                    }
                  >
                    <View style={styles.resultIconWrap}>
                      <Ionicons name="calendar-outline" size={18} color={theme.colors.link} />
                    </View>
                    <View style={styles.resultTextCol}>
                      <Text style={styles.resultTitle}>{event.title?.trim() || 'Appointment'}</Text>
                      {detail ? (
                        <Text style={styles.resultSubtitle} numberOfLines={1}>
                          {detail}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <LocationSelectSheet
        visible={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        onSelected={() => setLocationSheetOpen(false)}
      />
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  headerWrap: { position: 'relative' },
  settingsBtn: {
    position: 'absolute',
    right: theme.spacing.xl,
    padding: theme.spacing.sm,
  },
  searchWrap: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    padding: 0,
  },
  scopeRow: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  scopeText: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  body: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.md },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.md,
  },
  viewMore: {
    color: theme.colors.link,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
  },
  suggestedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.lg,
  },
  appsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.lg,
  },
  suggestedItem: {
    width: 72,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  suggestedCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  suggestedCircleActive: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  suggestedLabel: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
    textAlign: 'center',
  },
  resultList: { gap: theme.spacing.sm },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  resultIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.link}18`,
  },
  resultTextCol: { flex: 1, minWidth: 0, gap: 2 },
  resultTitle: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.fontSize.sm,
  },
  resultSubtitle: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.xs,
  },
  loader: { marginVertical: theme.spacing.xl },
  emptyHint: {
    color: theme.colors.foregroundMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
    marginVertical: theme.spacing.lg,
  },
  errorText: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
    marginVertical: theme.spacing.md,
  },
});
}
