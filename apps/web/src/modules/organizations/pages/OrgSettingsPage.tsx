import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Input } from "@repo/ui/components/ui/input";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

type PendingInvitation = {
  id: string;
  email: string;
  role: "member" | "admin" | "owner";
  expiresAt: Date;
  status: string;
};

export function OrgSettingsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: activeOrg, isPending } = authClient.useActiveOrganization();
  const { data: session } = authClient.useSession();

  const [orgName, setOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [pendingInvitations, setPendingInvitations] = useState<
    PendingInvitation[]
  >([]);

  const myRole =
    activeOrg?.members?.find((member) => member.userId === session?.user?.id)
      ?.role ?? null;
  const isOwner = myRole === "owner";
  const isOwnerOrAdmin = isOwner || myRole === "admin";
  const slugMatches =
    !activeOrg || slug === activeOrg.slug || slug === activeOrg.id;

  const loadInvitations = async () => {
    if (!activeOrg || !isOwnerOrAdmin) {
      return;
    }

    const result = await authClient.organization.listInvitations();
    if (!result.data) {
      return;
    }

    const invitations = Array.isArray(result.data)
      ? result.data
      : [result.data];

    setPendingInvitations(
      invitations.filter((invitation) => invitation.status === "pending"),
    );
  };

  useEffect(() => {
    void loadInvitations();
  }, [activeOrg?.id, isOwnerOrAdmin]);

  if (isPending) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Loading organization...
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>No active organization</CardTitle>
            <CardDescription>
              Select an organization in the sidebar or create a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/organizations/new")}>
              Create organization
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!slugMatches) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Organization mismatch</CardTitle>
            <CardDescription>
              Switch to the requested organization in the workspace selector.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleRename = async () => {
    if (!orgName.trim()) {
      return;
    }

    const result = await authClient.organization.update({
      organizationId: activeOrg.id,
      data: { name: orgName.trim() },
    });

    if (result.error) {
      toast.error(result.error.message ?? "Failed to rename organization");
      return;
    }

    toast.success("Organization updated");
    setOrgName("");
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      return;
    }

    const result = await authClient.organization.inviteMember({
      organizationId: activeOrg.id,
      email: inviteEmail.trim(),
      role: inviteRole,
    });

    if (result.error) {
      toast.error(result.error.message ?? "Failed to invite member");
      return;
    }

    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteEmail("");
    await loadInvitations();
  };

  const handleRemoveMember = async (memberId: string) => {
    const result = await authClient.organization.removeMember({
      organizationId: activeOrg.id,
      memberIdOrEmail: memberId,
    });

    if (result.error) {
      toast.error(result.error.message ?? "Failed to remove member");
      return;
    }

    toast.success("Member removed");
  };

  const handleRoleChange = async (memberId: string, role: "member" | "admin") => {
    const result = await authClient.organization.updateMemberRole({
      organizationId: activeOrg.id,
      memberId,
      role,
    });

    if (result.error) {
      toast.error(result.error.message ?? "Failed to update role");
      return;
    }

    toast.success("Role updated");
  };

  const handleLeave = async () => {
    if (!window.confirm(`Leave "${activeOrg.name}"?`)) {
      return;
    }

    const result = await authClient.organization.leave({
      organizationId: activeOrg.id,
    });

    if (result.error) {
      toast.error(result.error.message ?? "Failed to leave organization");
      return;
    }

    await authClient.organization.setActive({ organizationId: null });
    navigate("/");
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${activeOrg.name}" permanently?`)) {
      return;
    }

    const result = await authClient.organization.delete({
      organizationId: activeOrg.id,
    });

    if (result.error) {
      toast.error(result.error.message ?? "Failed to delete organization");
      return;
    }

    await authClient.organization.setActive({ organizationId: null });
    toast.success("Organization deleted");
    navigate("/");
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{activeOrg.name}</h1>
        <p className="text-sm text-muted-foreground">
          Manage members and workspace settings
        </p>
      </div>

      {isOwnerOrAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row">
            <Input
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              placeholder="New organization name"
            />
            <Button onClick={() => void handleRename()}>Rename</Button>
          </CardContent>
        </Card>
      ) : null}

      {isOwnerOrAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite members</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="person@company.com"
            />
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={inviteRole}
              onChange={(event) =>
                setInviteRole(event.target.value as "member" | "admin")
              }
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <Button onClick={() => void handleInvite()}>Send invite</Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeOrg.members?.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{member.user?.name ?? member.userId}</p>
                <p className="text-sm text-muted-foreground">
                  {member.user?.email ?? "No email available"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                  {member.role}
                </span>
                {isOwnerOrAdmin &&
                member.role !== "owner" &&
                member.userId !== session?.user?.id ? (
                  <>
                    <select
                      className="h-9 rounded-md border bg-transparent px-3 text-sm"
                      value={member.role}
                      onChange={(event) =>
                        void handleRoleChange(
                          member.id,
                          event.target.value as "member" | "admin",
                        )
                      }
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                    <Button
                      variant="outline"
                      onClick={() => void handleRemoveMember(member.id)}
                    >
                      Remove
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {isOwnerOrAdmin && pendingInvitations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="rounded-lg border p-4 text-sm"
              >
                <p className="font-medium">{invitation.email}</p>
                <p className="text-muted-foreground">
                  Role: {invitation.role} · Expires:{" "}
                  {new Date(invitation.expiresAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {!isOwner ? (
            <Button variant="outline" onClick={() => void handleLeave()}>
              Leave organization
            </Button>
          ) : null}
          {isOwner ? (
            <Button variant="destructive" onClick={() => void handleDelete()}>
              Delete organization
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
