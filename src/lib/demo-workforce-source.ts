export interface DemoWorkforceSourceMatchInput {
  enabled: boolean;
  configuredOrgId?: string;
  requestedOrgId?: string;
}

/**
 * Keeps the synthetic workforce source isolated to one explicitly configured
 * access organization. Missing identifiers never act as a wildcard.
 */
export function isExactDemoWorkforceOrg({
  enabled,
  configuredOrgId,
  requestedOrgId,
}: DemoWorkforceSourceMatchInput): boolean {
  if (!enabled) return false;
  const configured = configuredOrgId?.trim();
  const requested = requestedOrgId?.trim();
  return Boolean(configured && requested && configured === requested);
}
