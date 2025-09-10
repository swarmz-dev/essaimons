import { inject } from '@adonisjs/core';
import { HttpContext } from '@adonisjs/core/http';
import { getPendingFriendNotificationsValidator } from '#validators/notification';
import PendingFriendNotificationRepository from '#repositories/pending_friend_notification_repository';
import cache from '@adonisjs/cache/services/main';
import PaginatedPendingFriendNotifications from '#types/paginated/paginated_pending_friend_notifications';

@inject()
export default class NotificationController {
    constructor(private readonly pendingFriendNotificationRepository: PendingFriendNotificationRepository) {}

    public async getTotalCount({ response, user }: HttpContext) {
        return response.ok({
            count: await cache.getOrSet({
                key: `notifications-count:${user.id}`,
                ttl: '5m',
                factory: async (): Promise<number> => {
                    return await this.pendingFriendNotificationRepository.getCount(user);
                },
            }),
        });
    }

    public async getPendingFriends({ request, response, user }: HttpContext) {
        const { page, limit, seen } = await request.validateUsing(getPendingFriendNotificationsValidator);

        return response.ok({
            notifications: await cache.getOrSet({
                key: `notifications:${user.id}`,
                ttl: '5m',
                factory: async (): Promise<PaginatedPendingFriendNotifications> => {
                    return await this.pendingFriendNotificationRepository.getPagination(page ?? 1, limit ?? 30, user, seen);
                },
            }),
        });
    }
}
