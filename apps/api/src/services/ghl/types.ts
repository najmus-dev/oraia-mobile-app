export interface GhlLocation {
  id: string;
  companyId?: string;
  name: string;
  address?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  timezone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  locationLogoUrl?: string;
  logo_url?: string;
  businessLogoUrl?: string;
  logo?: string;
  imageUrl?: string;
  profilePhoto?: string;
  photoUrl?: string;
}

export interface GhlLocationsSearchResponse {
  locations: GhlLocation[];
  count?: number;
}

export interface GhlInstalledLocation {
  _id: string;
  name: string;
  address?: string;
  isInstalled: boolean;
  logoUrl?: string;
  locationLogoUrl?: string;
  logo_url?: string;
  businessLogoUrl?: string;
  logo?: string;
  imageUrl?: string;
}

export interface GhlInstalledLocationsResponse {
  locations: GhlInstalledLocation[];
  count?: number;
}

export interface GhlOAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  companyId?: string;
  locationId?: string;
  refreshTokenId?: string;
  userType?: string;
}

export interface GhlContactDndSettings {
  Call?: { status?: string };
  Email?: { status?: string };
  SMS?: { status?: string };
  WhatsApp?: { status?: string };
  GMB?: { status?: string };
  FB?: { status?: string };
}

export interface GhlContact {
  id: string;
  locationId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  timezone?: string;
  type?: string;
  tags?: string[];
  assignedTo?: string;
  website?: string;
  address1?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  dnd?: boolean;
  dndSettings?: GhlContactDndSettings;
  dateAdded?: string;
  dateUpdated?: string;
}

export interface GhlLocationTag {
  id: string;
  name: string;
}

export interface GhlContactsListResponse {
  contacts: GhlContact[];
  contact?: GhlContact;
  meta?: {
    total?: number;
    nextPageUrl?: string;
    startAfterId?: string;
    startAfter?: number;
    page?: number;
    pageLimit?: number;
    hasMore?: boolean;
  };
}

export interface GhlContactsSearchResponse {
  contacts?: GhlContact[];
  total?: number;
  traceId?: string;
}

export interface GhlConversation {
  id: string;
  contactId?: string;
  locationId?: string;
  lastMessageBody?: string;
  lastMessageDate?: string;
  lastMessageType?: string;
  unreadCount?: number;
  starred?: boolean;
  fullName?: string;
  contactName?: string;
  assignedTo?: string;
}

export interface GhlConversationsSearchResponse {
  conversations: GhlConversation[];
  total?: number;
}

export interface GhlMessage {
  id: string;
  body?: string;
  direction?: string;
  status?: string;
  type?: number;
  messageType?: string;
  dateAdded?: string;
  contactId?: string;
  conversationId?: string;
  attachments?: string[] | Array<Record<string, unknown>>;
}

export interface GhlMessagesResponse {
  messages: {
    messages?: GhlMessage[];
    lastMessageId?: string;
    nextPage?: boolean;
  };
}

export interface GhlCalendarEvent {
  id: string;
  title?: string;
  calendarId?: string;
  locationId?: string;
  contactId?: string;
  startTime?: string;
  endTime?: string;
  appointmentStatus?: string;
}

export interface GhlCalendarEventsResponse {
  events: GhlCalendarEvent[];
}

export interface GhlOpportunity {
  id: string;
  name: string;
  pipelineId?: string;
  pipelineStageId?: string;
  status?: string;
  monetaryValue?: number;
  contactId?: string;
  locationId?: string;
  dateAdded?: string;
  source?: string;
  assignedTo?: string;
  companyName?: string;
}

export interface GhlOpportunitiesSearchResponse {
  opportunities: GhlOpportunity[];
  meta?: { total?: number };
}

export interface GhlPipelinesResponse {
  pipelines: Array<{
    id: string;
    name: string;
    stages?: Array<{ id: string; name: string }>;
  }>;
}

export interface GhlTask {
  id?: string;
  _id?: string;
  title?: string;
  body?: string;
  assignedTo?: string;
  dueDate?: string;
  completed?: boolean;
  contactId?: string;
  contactDetails?: { firstName?: string; lastName?: string };
  assignedToUserDetails?: { id?: string; firstName?: string; lastName?: string };
  [key: string]: unknown;
}

export interface GhlTasksSearchResponse {
  tasks?: GhlTask[];
}

export interface GhlUser {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface GhlUsersSearchResponse {
  users?: GhlUser[];
  count?: number;
}

export interface GhlUsersFilterByEmailResponse {
  users?: GhlUser[];
}
