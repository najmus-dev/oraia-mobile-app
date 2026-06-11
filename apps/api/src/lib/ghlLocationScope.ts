/**
 * GHL location scoping for Sub-Account (location) OAuth tokens.
 *
 * Two patterns (do not mix them up):
 *
 * 1. **Query param required** — search/list endpoints such as
 *    `GET /conversations/search` and `GET /calendars/events` return errors like
 *    "Location id and Contact id not given" or "Location ID is required" when
 *    `locationId` is missing from the query string. Use {@link withRequiredLocationQuery}.
 *
 * 2. **Query/body forbidden** — contact note/update endpoints reject redundant
 *    `locationId` in query or body with "property locationId should not exist".
 *    Pass scope via the `locationId` HTTP header only ({@link omitRedundantLocationId}).
 *
 * @see https://marketplace.gohighlevel.com/docs/ghl/conversations/search-conversation
 * @see https://marketplace.gohighlevel.com/docs/ghl/contacts/get-all-notes
 */
export function omitRedundantLocationId<T extends Record<string, unknown>>(
  value: T,
): Omit<T, 'locationId'> {
  const { locationId: _removed, ...rest } = value;
  return rest;
}

/** Remove locationId from query params while keeping other filters. */
export function queryWithoutLocationId<T extends Record<string, unknown>>(
  params: T,
): Omit<T, 'locationId' | 'location_id'> {
  const { locationId: _a, location_id: _b, ...rest } = params;
  return rest;
}

/** Add locationId to query params for GHL search/list endpoints that require it. */
export function withRequiredLocationQuery<T extends Record<string, unknown>>(
  locationId: string,
  params?: T,
): T & { locationId: string } {
  return { ...(params ?? ({} as T)), locationId };
}
