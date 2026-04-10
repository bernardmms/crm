import { authClient } from "@/lib/auth-client";

export function useActiveOrg() {
  const { data: session } = authClient.useSession();
  const { data: orgs } = authClient.useListOrganizations();

  const activeOrgId = session?.session?.activeOrganizationId ?? null;
  const activeOrg = orgs?.find((o) => o.id === activeOrgId) ?? null;

  const switchOrg = async (orgId: string | null) => {
    if (orgId) {
      await authClient.organization.setActive({ organizationId: orgId });
    } else {
      await authClient.organization.setActive({ organizationId: null });
    }
  };

  return { activeOrg, activeOrgId, orgs: orgs ?? [], switchOrg };
}
