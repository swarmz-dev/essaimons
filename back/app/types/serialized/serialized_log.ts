import type { LogResponseStatusEnum } from '../enum/log_response_status_enum.js';
import type { LogRouteMethodEnum } from '../enum/log_route_method_enum.js';
import type { SerializedLogUser } from './serialized_log_user.js';

export type SerializedLog = {
    id: number;
    route: string;
    routeMethod: LogRouteMethodEnum;
    queryString?: Record<string, unknown>;
    params?: Record<string, unknown>;
    body?: Record<string, unknown>;
    responseStatus: LogResponseStatusEnum;
    responseBody: Record<string, unknown>;
    startTime: string;
    endTime: string;
    user?: SerializedLogUser;
    updatedAt?: string;
    createdAt?: string;
};

export default SerializedLog;
