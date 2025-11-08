import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';
import type { Authenticators } from '@adonisjs/auth/types';
import logger from '@adonisjs/core/services/logger';

export default class AuthMiddleware {
    async handle(
        ctx: HttpContext,
        next: NextFn,
        options: {
            guards?: (keyof Authenticators)[];
        } = {}
    ): Promise<any> {
        logger.debug('AuthMiddleware - START', { url: ctx.request.url() });
        ctx.user = await ctx.auth.authenticateUsing(options.guards);
        logger.debug('AuthMiddleware - User authenticated', { userId: ctx.user.id });
        const result = await next();
        logger.debug('AuthMiddleware - COMPLETE');
        return result;
    }
}
