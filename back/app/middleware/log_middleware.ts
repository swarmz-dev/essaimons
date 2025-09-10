import type { HttpContext } from '@adonisjs/core/http';
import Log from '#models/log';
import LogUser from '#models/log_user';
import LogRouteMethodEnum from '#types/enum/log_route_method_enum';
import LogResponseStatusEnum from '#types/enum/log_response_status_enum';
import { DateTime } from 'luxon';
import { inject } from '@adonisjs/core';
import LogUserRepository from '#repositories/log_user_repository';

@inject()
export default class LogHttpRequest {
    constructor(private readonly logUserRepository: LogUserRepository) {}

    public async handle(ctx: HttpContext, next: () => Promise<void>): Promise<void> {
        const { request, response } = ctx;

        const start: DateTime = DateTime.utc();

        const reqBodyRaw: unknown = request.body();
        const reqParamsRaw: unknown = request.params();
        const reqQuery: Record<string, unknown> = request.qs() ?? {};

        function isNonEmptyRecord(value: unknown): value is Record<string, unknown> {
            return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0;
        }

        function sanitizeBody(body: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
            if (!body) {
                return body;
            }
            const copy = { ...body };
            if ('password' in copy) {
                copy.password = 'HIDDEN';
            }
            if ('confirmPassword' in copy) {
                copy.confirmPassword = 'HIDDEN';
            }

            return copy;
        }

        const reqBody: Record<string, unknown> | undefined = isNonEmptyRecord(reqBodyRaw) ? reqBodyRaw : undefined;
        const reqParams: Record<string, unknown> | undefined = isNonEmptyRecord(reqParamsRaw) ? reqParamsRaw : undefined;

        const log: Log = new Log();
        log.route = request.url();
        log.routeMethod = request.method().toUpperCase() as LogRouteMethodEnum;
        log.queryString = reqQuery;
        log.body = sanitizeBody(reqBody);
        log.params = reqParams;
        log.startTime = start;

        try {
            await next();

            if (ctx.user) {
                const logUser: LogUser = await this.logUserRepository.firstOrFail({ email: ctx.user.email });
                log.userId = logUser.id;
            }
        } finally {
            log.responseStatus = response.getStatus() === 200 ? LogResponseStatusEnum.SUCCESS : LogResponseStatusEnum.ERROR;

            const respBodyRaw: unknown = response.getBody();
            log.responseBody = isNonEmptyRecord(respBodyRaw) ? (sanitizeBody(respBodyRaw as Record<string, unknown>) ?? {}) : {};

            log.endTime = DateTime.utc();

            try {
                await log.save();
            } catch (err) {
                ctx.logger.warn('Failed to save log', err);
            }
        }
    }
}
