import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ActiveOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.session?.session?.activeOrganizationId ?? null;
  },
);
