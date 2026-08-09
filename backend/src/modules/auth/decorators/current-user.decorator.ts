import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthUser = {
  userId: string;
  email: string;
};

/**
 * Extrait l’utilisateur authentifié (`request.user`) posé par JwtStrategy.
 * Usage : `@CurrentUser() user` ou `@CurrentUser('userId') userId`.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
