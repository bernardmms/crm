import { Injectable, ForbiddenException } from '@nestjs/common';
import { prisma } from '../lib/db';
import { isOwnerOrAdmin, type OrgContext } from '../lib/org-context';

@Injectable()
export class OrganizationService {
  async requireMember(orgId: string, userId: string) {
    const member = await prisma.member.findFirst({
      where: { organizationId: orgId, userId },
    });
    if (!member)
      throw new ForbiddenException('Not a member of this organization');
    return member;
  }

  async resolveOrgContext(
    activeOrgId: string | null,
    userId: string,
  ): Promise<OrgContext | null> {
    if (!activeOrgId) return null;
    const member = await this.requireMember(activeOrgId, userId);
    return { orgId: activeOrgId, userId, role: member.role };
  }

  isOwnerOrAdmin(role: string) {
    return isOwnerOrAdmin(role);
  }
}
