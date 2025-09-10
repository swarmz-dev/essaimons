import { inject } from '@adonisjs/core';
import FriendRepository from '#repositories/friend_repository';
import { HttpContext } from '@adonisjs/core/http';
import { searchFriendsValidator, acceptFriendValidator, refuseFriendValidator, removeFriendValidator } from '#validators/friend';
import User from '#models/user';
import PendingFriend from '#models/pending_friend';
import transmit from '@adonisjs/transmit/services/main';
import UserRepository from '#repositories/user_repository';
import PendingFriendRepository from '#repositories/pending_friend_repository';
import Friend from '#models/friend';
import cache from '@adonisjs/cache/services/main';
import PaginatedFriends from '#types/paginated/paginated_friends';

@inject()
export default class FriendController {
    constructor(
        private readonly friendRepository: FriendRepository,
        private readonly userRepository: UserRepository,
        private readonly pendingFriendRepository: PendingFriendRepository
    ) {}

    public async search({ request, response, user }: HttpContext) {
        const { query, page, limit } = await request.validateUsing(searchFriendsValidator);

        return response.ok({
            friends: await cache.getOrSet({
                key: `friends:${user.id}:query:${query}:page:${page}:limit:${limit}`,
                tags: ['friends', `friends:${user.id}`],
                ttl: '1h',
                factory: async (): Promise<PaginatedFriends> => {
                    return await this.friendRepository.search(query ?? '', page ?? 1, limit ?? 10, user);
                },
            }),
        });
    }

    public async accept({ request, response, user, i18n }: HttpContext) {
        const { userId } = await acceptFriendValidator.validate(request.params());

        const targetUser: User | null = await this.userRepository.firstOrFail({ frontId: userId });

        try {
            await this.friendRepository.findOneFromUsers(user, targetUser);
            return response.conflict({ message: i18n.t('messages.friend.accept.error', { username: targetUser.username }) });
        } catch (error: any) {}

        const pendingFriend: PendingFriend = await this.pendingFriendRepository.findOneFromUsers(user, targetUser);

        await Promise.all([
            Friend.createMany([
                {
                    userId: user.id,
                    friendId: targetUser.id,
                },
                {
                    userId: targetUser.id,
                    friendId: user.id,
                },
            ]),
            pendingFriend.notification.delete(),
            pendingFriend.delete(),
            cache.deleteByTag({
                tags: [`not-friends:${user.id}`, `friends:${user.id}`, `not-friends:${targetUser.id}`, `friends:${targetUser.id}`],
            }),
        ]);

        transmit.broadcast(`notification/add-friend/accept/${userId}`, user.apiSerialize());

        return response.ok({ message: i18n.t('messages.friend.accept.success', { username: targetUser.username }) });
    }

    public async refuse({ request, response, user, i18n }: HttpContext) {
        const { userId } = await refuseFriendValidator.validate(request.params());

        const targetUser: User | null = await this.userRepository.firstOrFail({ frontId: userId });

        let pendingFriend: PendingFriend = await this.pendingFriendRepository.findOneFromUsers(user, targetUser);

        await Promise.all([pendingFriend.notification.delete(), pendingFriend.delete(), cache.deleteByTag({ tags: [`not-friends:${user.id}`, `not-friends:${targetUser.id}`] })]);

        transmit.broadcast(`notification/add-friend/refuse/${userId}`, user.apiSerialize());

        return response.ok({ message: i18n.t('messages.friend.refuse.success') });
    }

    public async remove({ request, response, user, i18n }: HttpContext) {
        const { userId } = await removeFriendValidator.validate(request.params());

        const targetUser: User | null = await this.userRepository.firstOrFail({ frontId: userId });

        const friendRelationships: Friend[] = await this.friendRepository.findFromUsers(user, targetUser);
        if (!friendRelationships.length) {
            return response.notFound({ error: i18n.t('messages.friend.remove.error', { username: targetUser.username }) });
        }

        await Promise.all([friendRelationships.map(async (friend: Friend): Promise<void> => friend.delete()), cache.deleteByTag({ tags: [`friends:${user.id}`, `friends:${targetUser.id}`] })]);

        transmit.broadcast(`notification/friend/remove/${userId}`, user.apiSerialize());
        transmit.broadcast(`notification/friend/remove/${user.frontId}`, targetUser.apiSerialize());

        return response.ok({ message: i18n.t('messages.friend.remove.success', { username: targetUser.username }) });
    }
}
