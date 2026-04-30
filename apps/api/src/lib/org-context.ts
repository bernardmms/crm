export type OrgContext = {
  orgId: string;
  userId: string;
  role: string;
};

export function isOwnerOrAdmin(role: string): boolean {
  return role === 'owner' || role === 'admin';
}
