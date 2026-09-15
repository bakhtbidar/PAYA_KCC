import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RoleCode } from '../../common/enums';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  fullName: string;
  roles: RoleCode[];
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
