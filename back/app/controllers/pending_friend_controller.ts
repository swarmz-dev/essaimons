import { inject } from '@adonisjs/core';
import { HttpContext } from '@adonisjs/core/http';
import { searchPendingFriendsValidator, addPendingFriendValidator, cancelPendingFriendValidator } from '#validators/pending_friend';
import PendingFriendRepository from '#repositories/pending_friend_repository';
import PendingFriend from '#models/pending_friend';
import transmit from '@adonisjs/transmit/services/main';
import UserRepository from '#repositories/user_repository';
import User from '#models/user';
import PendingFriendNotification from '#models/pending_friend_notification';
import cache from '@adonisjs/cache/services/main';
import PaginatedPendingFriends from '#types/paginated/paginated_pending_friends';
import FriendRepository from '#repositories/friend_repository';

@inject()
export default class PendingFriendController {
    constructor(
        private readonly friendRepository: FriendRepository,
        private readonly pendingFriendRepository: PendingFriendRepository,
        private readonly userRepository: UserRepository
    ) {}

    public async search({ request, response, user }: HttpContext) {
        const { query, page, limit } = await request.validateUsing(searchPendingFriendsValidator);

        return response.ok({
            pendingFriends: await cache.getOrSet({
                key: `pending-friends:${user.id}`,
                ttl: '1h',
                tags: ['pending-friends', `pending-friends:${user.id}`],
                factory: async (): Promise<PaginatedPendingFriends> => {
                    return await this.pendingFriendRepository.search(query ?? '', page ?? 1, limit ?? 10, user);
                },
            }),
        });
    }

    public async add({ request, response, user, i18n }: HttpContext) {
        const { userId } = await addPendingFriendValidator.validate(request.params());

        const targetUser: User = await this.userRepository.firstOrFail({ frontId: userId });

        try {
            await this.friendRepository.findOneFromUsers(user, targetUser);
            return response.conflict({ message: i18n.t('messages.pending-friend.add.error', { username: targetUser.username }) });
        } catch (error: any) {}

        let pendingFriend: PendingFriend | null;
        try {
            pendingFriend = await this.pendingFriendRepository.findOneFromUsers(user, targetUser);
        } catch (error: any) {
            pendingFriend = await PendingFriend.create({
                userId: user.id,
                friendId: targetUser.id,
            });
            await pendingFriend.refresh();

            await PendingFriendNotification.create({
                forId: targetUser.id,
                fromId: user.id,
                pendingFriendId: pendingFriend.id,
            });

            await pendingFriend.load('friend');
            await pendingFriend.load('notification', (notificationQuery): void => {
                notificationQuery.preload('from');
            });

            console.log(`notification/add-friend/${userId}`);
            transmit.broadcast(`notification/add-friend/${userId}`, pendingFriend.apiSerialize());
        }

        return response.ok({
            message: i18n.t('messages.pending-friend.add.success', { username: targetUser.username }),
            pendingFriend: pendingFriend.apiSerialize(),
        });
    }

    public async cancel({ request, response, user, i18n }: HttpContext) {
        const { userId } = await cancelPendingFriendValidator.validate(request.params());

        const targetUser: User = await this.userRepository.firstOrFail({ frontId: userId });
        const pendingFriend: PendingFriend = await this.pendingFriendRepository.findOneFromUsers(user, targetUser);

        if (pendingFriend.userId === user.id || pendingFriend.friendId === user.id) {
            transmit.broadcast(`notification/add-friend/cancel/${userId}`, pendingFriend.apiSerialize());
            await pendingFriend.notification.delete();
            await pendingFriend.delete();

            return response.ok({ message: i18n.t('messages.pending-friend.cancel.success', { username: targetUser.username }) });
        }

        return response.forbidden({ error: i18n.t('messages.pending-friend.cancel.error', { username: targetUser.username }) });
    }
}
