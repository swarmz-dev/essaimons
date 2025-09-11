import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';
import UserRoleEnum from '#types/enum/user_role_enum';

export default class IsAdminMiddleware {
    async handle(ctx: HttpContext, next: NextFn): Promise<any> {
        if (!ctx.user || ctx.user.role !== UserRoleEnum.ADMIN) {
            return ctx.response.forbidden({ error: 'You must be admin' });
        }

        return next();
    }
}
