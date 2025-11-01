import type { HttpContext } from '@adonisjs/core/http';
import Log from '#models/log';
import LogUser from '#models/log_user';
import { LogRouteMethodEnum } from '#types/enum/log_route_method_enum';
import { LogResponseStatusEnum } from '#types/enum/log_response_status_enum';
import { DateTime } from 'luxon';
import { inject } from '@adonisjs/core';
import LogUserRepository from '#repositories/log_user_repository';
import logger from '@adonisjs/core/services/logger';

@inject()
export default class LogHttpRequest {
    constructor(private readonly logUserRepository: LogUserRepository) {}

    public async handle(ctx: HttpContext, next: () => Promise<void>): Promise<void> {
        const requestUrl = ctx.request.url();
        const requestMethod = ctx.request.method();
        logger.info(`LogMiddleware - START: ${requestMethod} ${requestUrl}`);
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
            logger.info('LogMiddleware - Before next()');
            await next();
            logger.info('LogMiddleware - After next()');

            if (ctx.user) {
                logger.info('LogMiddleware - Creating log user');
                const logUser: LogUser = await this.logUserRepository.firstOrCreate({ email: ctx.user.email }, { email: ctx.user.email });
                log.userId = logUser.id;
                logger.info('LogMiddleware - Log user created');
            }
        } finally {
            logger.info('LogMiddleware - In finally block');
            log.responseStatus = response.getStatus() === 200 ? LogResponseStatusEnum.SUCCESS : LogResponseStatusEnum.ERROR;

            const respBodyRaw: unknown = response.getBody();
            log.responseBody = isNonEmptyRecord(respBodyRaw) ? (sanitizeBody(respBodyRaw as Record<string, unknown>) ?? {}) : {};

            log.endTime = DateTime.utc();

            try {
                logger.info('LogMiddleware - Saving log to database');
                await log.save();
                logger.info('LogMiddleware - Log saved successfully');
            } catch (err) {
                ctx.logger.warn('Failed to save log', err);
            }
            logger.info('LogMiddleware - COMPLETE');
        }
    }
}
