import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';
import type { Authenticators } from '@adonisjs/auth/types';

export default class AuthMiddleware {
    async handle(
        ctx: HttpContext,
        next: NextFn,
        options: {
            guards?: (keyof Authenticators)[];
        } = {}
    ): Promise<any> {
        ctx.user = await ctx.auth.authenticateUsing(options.guards);
        return next();
    }
}
