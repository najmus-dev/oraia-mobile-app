/** GHL/Twilio append TCPA opt-out footers to outbound SMS — hide them in the thread UI. */
const SMS_COMPLIANCE_FOOTER =
  /(?:\r?\n)+\s*Reply STOP to unsubscribe\.?\s*(?:\r?\n)+\s*Thanks,.*$/is;

export function stripSmsComplianceFooter(body?: string): string {
  if (!body?.trim()) return '';
  return body.replace(SMS_COMPLIANCE_FOOTER, '').trim();
}

/** Body text shown in bubbles and previews (user-authored content only). */
export function formatMessageBodyForDisplay(body?: string): string | undefined {
  const trimmed = body?.trim();
  if (!trimmed) return undefined;
  const withoutFooter = stripSmsComplianceFooter(trimmed);
  return withoutFooter || trimmed;
}
