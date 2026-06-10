import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { config } from '../../config';
import { GHL_CALENDAR_API_VERSION } from '../../lib/calendarFreeSlots';
import { AppError } from '../../lib/errors';
import {
  buildCompanyAuthCodeBody,
  buildCompanyRefreshTokenBody,
  decodeJwtExpiry,
  resolveGhlTokenExpiry,
} from '../../lib/ghlOAuth';
import type {
  GhlCalendarEventsResponse,
  GhlContact,
  GhlContactsListResponse,
  GhlContactsSearchResponse,
  GhlConversationsSearchResponse,
  GhlInstalledLocationsResponse,
  GhlLocationsSearchResponse,
  GhlMessagesResponse,
  GhlOAuthTokenResponse,
  GhlOpportunitiesSearchResponse,
  GhlPipelinesResponse,
  GhlTask,
  GhlTasksSearchResponse,
  GhlUser,
  GhlUsersSearchResponse,
  GhlUsersFilterByEmailResponse,
} from './types';

export type GhlClientOptions = {
  /** Invalidate cached token and refresh; GHL request is retried once on 401. */
  onUnauthorized?: () => Promise<void>;
};

interface RetryableAxiosConfig extends InternalAxiosRequestConfig {
  _ghlRetried?: boolean;
}

function isOAuthTokenRequest(url: string | undefined): boolean {
  return Boolean(url?.includes('/oauth/token'));
}

export class GhlClient {
  private readonly http: AxiosInstance;

  constructor(
    private getAccessToken: () => Promise<string>,
    private options?: GhlClientOptions,
  ) {
    this.http = axios.create({
      baseURL: config.ghl.baseUrl,
      timeout: 30_000,
    });

    this.http.interceptors.response.use(
      (response) => response,
      async (error: unknown) => {
        if (!axios.isAxiosError(error) || !error.config || error.response?.status !== 401) {
          throw error;
        }

        const requestConfig = error.config as RetryableAxiosConfig;
        if (requestConfig._ghlRetried || isOAuthTokenRequest(requestConfig.url)) {
          throw error;
        }

        if (!this.options?.onUnauthorized) {
          throw error;
        }

        requestConfig._ghlRetried = true;
        await this.options.onUnauthorized();
        const token = await this.getAccessToken();
        requestConfig.headers = requestConfig.headers ?? {};
        requestConfig.headers.Authorization = `Bearer ${token}`;
        return this.http.request(requestConfig);
      },
    );
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      Version: config.ghl.apiVersion,
      Accept: 'application/json',
    };
  }

  async listInstalledLocations(
    companyId: string,
    appId: string,
  ): Promise<GhlInstalledLocationsResponse> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get<GhlInstalledLocationsResponse>(
      '/oauth/installedLocations',
      { headers, params: { companyId, appId } },
    );
    return data;
  }

  async searchLocations(params?: { limit?: number; skip?: number }): Promise<GhlLocationsSearchResponse> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get<GhlLocationsSearchResponse>('/locations/search', {
      headers,
      params,
    });
    return data;
  }

  async exchangeLocationToken(companyId: string, locationId: string): Promise<GhlOAuthTokenResponse> {
    const headers = await this.authHeaders();
    const { data } = await this.http.post<GhlOAuthTokenResponse>(
      '/oauth/locationToken',
      { companyId, locationId },
      { headers: { ...headers, 'Content-Type': 'application/json' } },
    );
    return data;
  }

  async listContacts(
    locationId: string,
    params?: {
      limit?: number;
      query?: string;
      startAfterId?: string;
      startAfter?: number;
    },
  ): Promise<GhlContactsListResponse> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get<GhlContactsListResponse>('/contacts/', {
      headers,
      params: {
        locationId,
        limit: params?.limit ?? 20,
        query: params?.query,
        startAfterId: params?.startAfterId,
        startAfter: params?.startAfter,
      },
    });
    return data;
  }

  async listLocationTags(locationId: string): Promise<{ tags?: Array<{ id: string; name: string }> }> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get<{ tags?: Array<{ id: string; name: string }> }>(
      `/locations/${locationId}/tags`,
      { headers },
    );
    return data;
  }

  /** GHL smart lists are internal-only; probe known paths and return [] if unavailable. */
  async listSmartLists(locationId: string): Promise<unknown[]> {
    const headers = await this.authHeaders();
    const jsonHeaders = { ...headers, 'Content-Type': 'application/json' };
    const attempts: Array<() => Promise<unknown>> = [
      async () => {
        const { data } = await this.http.post('/smartlists/search', { locationId }, { headers: jsonHeaders });
        return data;
      },
      async () => {
        const { data } = await this.http.post(
          '/contacts/smartlists/search',
          { locationId },
          { headers: jsonHeaders },
        );
        return data;
      },
      async () => {
        const { data } = await this.http.get(`/locations/${locationId}/smartlists`, { headers });
        return data;
      },
      async () => {
        const { data } = await this.http.get('/smartlists', { headers, params: { locationId } });
        return data;
      },
    ];

    for (const attempt of attempts) {
      try {
        const data = await attempt();
        const parsed = data as Record<string, unknown>;
        const rows =
          parsed?.smartLists ??
          parsed?.lists ??
          parsed?.items ??
          (Array.isArray(data) ? data : undefined);
        if (Array.isArray(rows) && rows.length > 0) return rows;
      } catch {
        // try next undocumented path
      }
    }
    return [];
  }

  async searchContacts(
    locationId: string,
    body: {
      query?: string;
      pageLimit?: number;
      page?: number;
      skip?: number;
      filters?: Array<{ field: string; operator: string; value: unknown }>;
      smartListId?: string;
    },
  ): Promise<GhlContactsSearchResponse> {
    const headers = await this.authHeaders();
    const payload: Record<string, unknown> = {
      locationId,
      pageLimit: body.pageLimit ?? 30,
    };
    if (body.query?.trim()) payload.query = body.query.trim();
    if (body.page != null) payload.page = body.page;
    if (body.skip != null) payload.skip = body.skip;
    if (body.filters?.length) payload.filters = body.filters;
    if (body.smartListId) payload.smartListId = body.smartListId;

    const { data } = await this.http.post<GhlContactsSearchResponse>(
      '/contacts/search',
      payload,
      { headers: { ...headers, 'Content-Type': 'application/json' } },
    );
    return data;
  }

  async getContact(contactId: string, locationId: string): Promise<GhlContact> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get<{ contact: GhlContact }>(`/contacts/${contactId}`, {
      headers,
      params: { locationId },
    });
    return data.contact;
  }

  async createContact(locationId: string, body: Record<string, unknown>): Promise<GhlContact> {
    const headers = await this.authHeaders();
    const { data } = await this.http.post<{ contact: GhlContact }>(
      '/contacts/',
      { ...body, locationId },
      { headers: { ...headers, 'Content-Type': 'application/json' } },
    );
    return data.contact;
  }

  async updateContact(
    contactId: string,
    locationId: string,
    body: Record<string, unknown>,
  ): Promise<GhlContact> {
    const headers = await this.authHeaders();
    const { data } = await this.http.put<{ contact: GhlContact }>(
      `/contacts/${contactId}`,
      body,
      { headers: { ...headers, 'Content-Type': 'application/json' }, params: { locationId } },
    );
    return data.contact;
  }

  async deleteContact(contactId: string, locationId: string): Promise<void> {
    const headers = await this.authHeaders();
    await this.http.delete(`/contacts/${contactId}`, {
      headers,
      params: { locationId },
    });
  }

  async searchConversations(
    locationId: string,
    params?: {
      limit?: number;
      status?: string;
      query?: string;
      contactId?: string;
      assignedTo?: string;
      startAfterDate?: string;
    },
  ): Promise<GhlConversationsSearchResponse> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get<GhlConversationsSearchResponse>('/conversations/search', {
      headers,
      params: {
        locationId,
        limit: params?.limit ?? 20,
        status: params?.status,
        query: params?.query,
        contactId: params?.contactId,
        assignedTo: params?.assignedTo,
        startAfterDate: params?.startAfterDate,
      },
    });
    return data;
  }

  /** Active SMS numbers for a location ([docs](https://marketplace.gohighlevel.com/docs/ghl/phone-system/active-numbers/)). */
  async listActivePhoneNumbers(
    locationId: string,
    params?: { searchFilter?: string },
  ): Promise<{ numbers?: Array<Record<string, unknown>> }> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get<{ numbers?: Array<Record<string, unknown>> }>(
      `/phone-system/numbers/location/${locationId}`,
      { headers, params: { searchFilter: params?.searchFilter } },
    );
    return data;
  }

  async getConversationMessages(
    conversationId: string,
    locationId: string,
    params?: { limit?: number; lastMessageId?: string },
  ): Promise<GhlMessagesResponse> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get<GhlMessagesResponse>(
      `/conversations/${conversationId}/messages`,
      {
        headers,
        params: {
          locationId,
          limit: params?.limit ?? 50,
          ...(params?.lastMessageId ? { lastMessageId: params.lastMessageId } : {}),
        },
      },
    );
    return data;
  }

  async updateConversation(
    conversationId: string,
    locationId: string,
    body: { unreadCount?: number; starred?: boolean },
  ): Promise<unknown> {
    const headers = await this.authHeaders();
    const { data } = await this.http.put(
      `/conversations/${conversationId}`,
      { locationId, ...body },
      { headers: { ...headers, 'Content-Type': 'application/json' } },
    );
    return data;
  }

  async listContactNotes(contactId: string, locationId: string): Promise<{ notes?: Array<Record<string, unknown>> }> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get<{ notes?: Array<Record<string, unknown>> }>(
      `/contacts/${contactId}/notes`,
      { headers, params: { locationId } },
    );
    return data;
  }

  async createContactNote(
    contactId: string,
    locationId: string,
    body: string,
  ): Promise<{ note?: Record<string, unknown> }> {
    const headers = await this.authHeaders();
    const { data } = await this.http.post<{ note?: Record<string, unknown> }>(
      `/contacts/${contactId}/notes`,
      { body },
      { headers: { ...headers, 'Content-Type': 'application/json' }, params: { locationId } },
    );
    return data;
  }

  async uploadMessageAttachment(
    locationId: string,
    fields: { contactId?: string; conversationId?: string },
    file: { buffer: Buffer; filename: string; mimeType: string },
  ): Promise<unknown> {
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('locationId', locationId);
    if (fields.contactId) form.append('contactId', fields.contactId);
    if (fields.conversationId) form.append('conversationId', fields.conversationId);
    form.append('fileAttachment', file.buffer, {
      filename: file.filename,
      contentType: file.mimeType,
    });
    const headers = await this.authHeaders();
    const { data } = await this.http.post('/conversations/messages/upload', form, {
      headers: { ...headers, ...form.getHeaders() },
      maxBodyLength: 6 * 1024 * 1024,
    });
    return data;
  }

  async sendMessage(
    locationId: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const headers = await this.authHeaders();
    const { data } = await this.http.post('/conversations/messages', body, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      params: { locationId },
    });
    return data;
  }

  async listCalendars(locationId: string): Promise<{ calendars: Array<{ id: string; name?: string; locationId?: string }> }> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get<{ calendars: Array<{ id: string; name?: string; locationId?: string }> }>(
      '/calendars/',
      { headers, params: { locationId } },
    );
    return data;
  }

  async getFreeSlots(
    calendarId: string,
    query: { startDate: number; endDate: number; timezone?: string; userId?: string },
  ): Promise<unknown> {
    const baseHeaders = await this.authHeaders();
    const params: Record<string, string | number> = {
      startDate: query.startDate,
      endDate: query.endDate,
    };
    if (query.timezone) params.timezone = query.timezone;
    if (query.userId) params.userId = query.userId;
    const { data } = await this.http.get(`/calendars/${calendarId}/free-slots`, {
      headers: { ...baseHeaders, Version: GHL_CALENDAR_API_VERSION },
      params,
    });
    return data;
  }

  async getAppointment(eventId: string, _locationId: string): Promise<unknown> {
    const baseHeaders = await this.authHeaders();
    const { data } = await this.http.get(`/calendars/events/appointments/${eventId}`, {
      headers: { ...baseHeaders, Version: GHL_CALENDAR_API_VERSION },
    });
    return data;
  }

  async createAppointment(locationId: string, body: Record<string, unknown>): Promise<unknown> {
    const baseHeaders = await this.authHeaders();
    const { locationId: _omit, ...rest } = body;
    const { data } = await this.http.post(
      '/calendars/events/appointments',
      { ...rest, locationId },
      {
        headers: {
          ...baseHeaders,
          Version: GHL_CALENDAR_API_VERSION,
          'Content-Type': 'application/json',
        },
      },
    );
    return data;
  }

  async updateAppointment(
    eventId: string,
    _locationId: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const baseHeaders = await this.authHeaders();
    const { locationId: _omit, ...payload } = body;
    const { data } = await this.http.put(`/calendars/events/appointments/${eventId}`, payload, {
      headers: {
        ...baseHeaders,
        Version: GHL_CALENDAR_API_VERSION,
        'Content-Type': 'application/json',
      },
    });
    return data;
  }

  async deleteCalendarEvent(eventId: string, locationId: string): Promise<void> {
    const headers = await this.authHeaders();
    await this.http.delete(`/calendars/events/${eventId}`, {
      headers,
      params: { locationId },
    });
  }

  async listCalendarEvents(
    locationId: string,
    params: {
      startTime: string;
      endTime: string;
      calendarId?: string;
      userId?: string;
      groupId?: string;
    },
  ): Promise<GhlCalendarEventsResponse> {
    const headers = await this.authHeaders();
    const query: Record<string, string> = {
      locationId,
      startTime: params.startTime,
      endTime: params.endTime,
    };
    if (params.calendarId) query.calendarId = params.calendarId;
    else if (params.userId) query.userId = params.userId;
    else if (params.groupId) query.groupId = params.groupId;

    const { data } = await this.http.get<GhlCalendarEventsResponse>('/calendars/events', {
      headers,
      params: query,
    });
    return data;
  }

  async getOpportunity(opportunityId: string, locationId: string): Promise<unknown> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get(`/opportunities/${opportunityId}`, {
      headers,
      params: { locationId },
    });
    return data;
  }

  async createOpportunity(locationId: string, body: Record<string, unknown>): Promise<unknown> {
    const headers = await this.authHeaders();
    const { data } = await this.http.post(
      '/opportunities',
      { ...body, locationId },
      { headers: { ...headers, 'Content-Type': 'application/json' } },
    );
    return data;
  }

  async searchOpportunities(
    locationId: string,
    params?: {
      limit?: number;
      pipelineId?: string;
      status?: string;
      q?: string;
      startAfterId?: string;
      contactId?: string;
    },
  ): Promise<GhlOpportunitiesSearchResponse> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get<GhlOpportunitiesSearchResponse>('/opportunities/search', {
      headers,
      params: {
        location_id: locationId,
        limit: params?.limit ?? 20,
        pipeline_id: params?.pipelineId,
        status: params?.status,
        q: params?.q?.trim() || undefined,
        startAfterId: params?.startAfterId,
        contact_id: params?.contactId,
      },
    });
    return data;
  }

  async getPipelines(locationId: string): Promise<GhlPipelinesResponse> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get<GhlPipelinesResponse>('/opportunities/pipelines', {
      headers,
      params: { locationId },
    });
    return data;
  }

  async updateOpportunity(
    opportunityId: string,
    locationId: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const headers = await this.authHeaders();
    const { data } = await this.http.put(`/opportunities/${opportunityId}`, body, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      params: { locationId },
    });
    return data;
  }

  async deleteOpportunity(opportunityId: string, locationId: string): Promise<void> {
    const headers = await this.authHeaders();
    await this.http.delete(`/opportunities/${opportunityId}`, {
      headers,
      params: { locationId },
    });
  }

  async searchLocationTasks(
    locationId: string,
    body: {
      contactId?: string[];
      completed?: boolean;
      assignedTo?: string[];
      query?: string;
      limit?: number;
      skip?: number;
    },
  ): Promise<GhlTasksSearchResponse> {
    const headers = await this.authHeaders();
    const { data } = await this.http.post<GhlTasksSearchResponse>(
      `/locations/${locationId}/tasks/search`,
      body,
      { headers: { ...headers, 'Content-Type': 'application/json' } },
    );
    return data;
  }

  async listContactTasks(contactId: string): Promise<GhlTasksSearchResponse> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get<GhlTasksSearchResponse>(`/contacts/${contactId}/tasks`, {
      headers,
    });
    return data;
  }

  async createContactTask(
    contactId: string,
    body: Record<string, unknown>,
  ): Promise<{ task?: GhlTask }> {
    const headers = await this.authHeaders();
    const { data } = await this.http.post<{ task?: GhlTask }>(
      `/contacts/${contactId}/tasks`,
      body,
      { headers: { ...headers, 'Content-Type': 'application/json' } },
    );
    return data;
  }

  async updateContactTask(
    contactId: string,
    taskId: string,
    body: Record<string, unknown>,
  ): Promise<{ task?: GhlTask }> {
    const headers = await this.authHeaders();
    const { data } = await this.http.put<{ task?: GhlTask }>(
      `/contacts/${contactId}/tasks/${taskId}`,
      body,
      { headers: { ...headers, 'Content-Type': 'application/json' } },
    );
    return data;
  }

  async updateContactTaskCompleted(
    contactId: string,
    taskId: string,
    completed: boolean,
  ): Promise<{ task?: GhlTask }> {
    const headers = await this.authHeaders();
    const { data } = await this.http.put<{ task?: GhlTask }>(
      `/contacts/${contactId}/tasks/${taskId}/completed`,
      { completed },
      { headers: { ...headers, 'Content-Type': 'application/json' } },
    );
    return data;
  }

  async deleteContactTask(contactId: string, taskId: string): Promise<void> {
    const headers = await this.authHeaders();
    await this.http.delete(`/contacts/${contactId}/tasks/${taskId}`, { headers });
  }

  async searchUsers(params: {
    companyId: string;
    locationId?: string;
    query?: string;
    limit?: number;
    skip?: number;
  }): Promise<GhlUsersSearchResponse> {
    const headers = await this.authHeaders();
    const { data } = await this.http.get<GhlUsersSearchResponse>('/users/search', {
      headers,
      params: {
        companyId: params.companyId,
        locationId: params.locationId,
        query: params.query,
        limit: params.limit ?? 50,
        skip: params.skip ?? 0,
      },
    });
    return data;
  }

  /** Exact email lookup — more reliable than GET /users/search?query= */
  async filterUsersByEmail(
    companyId: string,
    emails: string[],
  ): Promise<GhlUsersFilterByEmailResponse> {
    const headers = await this.authHeaders();
    const normalized = emails.map((e) => e.toLowerCase().trim()).filter(Boolean);
    const body = {
      companyId,
      emails: normalized.join(','),
      deleted: false,
      skip: '0',
      limit: String(Math.max(normalized.length, 1)),
      projection: 'all',
    };
    const { data } = await this.http.post<GhlUsersFilterByEmailResponse>(
      '/users/search/filter-by-email',
      body,
      { headers: { ...headers, 'Content-Type': 'application/json' } },
    );
    return data;
  }

  async refreshCompanyToken(refreshToken: string): Promise<GhlOAuthTokenResponse> {
    return GhlClient.refreshCompanyTokens(refreshToken);
  }

  /**
   * Refresh agency (company) access token per GHL OAuth 2.0 docs.
   * Requires user_type=Company and redirect_uri matching the marketplace app.
   */
  static async refreshCompanyTokens(refreshToken: string): Promise<GhlOAuthTokenResponse> {
    const redirectUri = config.oauth.redirectUri;
    if (!redirectUri) {
      throw new AppError(
        503,
        'Set GHL_OAUTH_REDIRECT_URI (must match GHL app redirect URI) for automatic token refresh',
        'OAUTH_NOT_CONFIGURED',
      );
    }

    const body = buildCompanyRefreshTokenBody({
      clientId: config.ghl.clientId,
      clientSecret: config.ghl.clientSecret,
      refreshToken,
      redirectUri,
    });
    const { data } = await axios.post<GhlOAuthTokenResponse>(
      `${config.ghl.baseUrl}/oauth/token`,
      body.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      },
    );
    return data;
  }

  /** Exchange OAuth authorization code (agency install) — no bearer token required. */
  static async exchangeAuthorizationCode(
    code: string,
    redirectUri: string,
  ): Promise<GhlOAuthTokenResponse> {
    const body = buildCompanyAuthCodeBody({
      clientId: config.ghl.clientId,
      clientSecret: config.ghl.clientSecret,
      code,
      redirectUri,
    });
    const { data } = await axios.post<GhlOAuthTokenResponse>(
      `${config.ghl.baseUrl}/oauth/token`,
      body.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      },
    );
    return data;
  }

  static tokenExpiresAt(expiresInSeconds: number | undefined, accessToken?: string): Date {
    return resolveGhlTokenExpiry(expiresInSeconds, accessToken);
  }

  static decodeJwtExpiry(token: string): Date | null {
    return decodeJwtExpiry(token);
  }
}
