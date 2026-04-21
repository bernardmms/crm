import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User as UserSchema } from '@prisma/client';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: UserSchema = request.user;
    return user;
  },
);
