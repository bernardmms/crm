import { authClient } from "@/lib/auth-client";

type Organization = {
  id: string;
  name: string;
  slug?: string | null;
};

function normalizeOrganizations(value: unknown): Organization[] {
  if (Array.isArray(value)) {
    return value as Organization[];
  }

  if (value && typeof value === "object") {
    const organizations = (value as { organizations?: unknown }).organizations;
    if (Array.isArray(organizations)) {
      return organizations as Organization[];
    }
  }

  return [];
}

export function useActiveOrg() {
  const { data: session } = authClient.useSession();
  const { data: orgsData } = authClient.useListOrganizations();
  const orgs = normalizeOrganizations(orgsData);

  const activeOrgId = session?.session?.activeOrganizationId ?? null;
  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? null;

  const switchOrg = async (orgId: string | null) => {
    if (orgId) {
      await authClient.organization.setActive({ organizationId: orgId });
    } else {
      await authClient.organization.setActive({ organizationId: null });
    }
  };

  return { activeOrg, activeOrgId, orgs, switchOrg };
}
