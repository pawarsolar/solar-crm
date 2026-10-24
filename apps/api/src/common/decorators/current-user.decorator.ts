import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ImpersonatorInfo {
  id: string;
  full_name?: string;
  role: string;
}

export interface AuthUser {
  id: string;
  email: string;
  org_id: string;
  role: string;
  team_id?: string;
  full_name?: string;
  phone?: string;
  /** Present only on a Super Admin "child login" session. */
  impersonator?: ImpersonatorInfo | null;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    return data && user ? user[data] : user;
  },
);
