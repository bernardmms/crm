import { authClient } from "@/lib/auth-client";

export function useOrgRole() {
  const { data: activeOrg } = authClient.useActiveOrganization();
  const { data: session } = authClient.useSession();

  const myRole =
    activeOrg?.members?.find((m) => m.userId === session?.user?.id)?.role ??
    null;

  const isPersonalWorkspace = !activeOrg;

  return { myRole, isPersonalWorkspace, activeOrg };
}
