import BaseRepository from '#repositories/base/base_repository';
import { ModelPaginatorContract, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model';
import User from '#models/user';
import SerializedFriend from '#types/serialized/serialized_friend';
import PaginatedPendingFriends from '#types/paginated/paginated_pending_friends';
import PendingFriend from '#models/pending_friend';
import PendingFriendNotification from '#models/pending_friend_notification';

export default class PendingFriendRepository extends BaseRepository<typeof PendingFriend> {
    constructor() {
        super(PendingFriend);
    }

    public async search(query: string, page: number, limit: number, user: User): Promise<PaginatedPendingFriends> {
        const pendingFriends: ModelPaginatorContract<PendingFriend> = await this.Model.query()
            .where('user_id', user.id)
            .if(query, (queryBuilder: ModelQueryBuilderContract<typeof PendingFriend>): void => {
                queryBuilder.leftJoin('users', 'pending_friends.friend_id', 'users.id').where('users.username', 'ILIKE', `%${query}%`);
            })
            .preload('friend')
            .preload('notification', (notificationQuery: ModelQueryBuilderContract<typeof PendingFriendNotification>): void => {
                notificationQuery.preload('from');
            })
            .paginate(page, limit);

        return {
            pendingFriends: await Promise.all(
                pendingFriends.all().map((pendingFriend: PendingFriend): SerializedFriend => {
                    return pendingFriend.apiSerialize();
                })
            ),
            firstPage: pendingFriends.firstPage,
            lastPage: pendingFriends.lastPage,
            limit,
            total: pendingFriends.total,
            currentPage: page,
        };
    }

    public async findOneFromUsers(from: User, askingTo: User): Promise<PendingFriend> {
        return this.Model.query()
            .where((query: ModelQueryBuilderContract<typeof PendingFriend>): void => {
                query.where('userId', askingTo.id).andWhere('friendId', from.id);
            })
            .orWhere((query: ModelQueryBuilderContract<typeof PendingFriend>): void => {
                query.where('userId', from.id).andWhere('friendId', askingTo.id);
            })
            .preload('notification', (notificationQuery: ModelQueryBuilderContract<typeof PendingFriendNotification>): void => {
                notificationQuery.preload('from');
            })
            .preload('friend')
            .preload('user')
            .firstOrFail();
    }

    public async findFromUsers(from: User, askingTo: User): Promise<PendingFriend[]> {
        return this.Model.query()
            .where((query: ModelQueryBuilderContract<typeof PendingFriend>): void => {
                query.where('userId', askingTo.id).andWhere('friendId', from.id);
            })
            .orWhere((query: ModelQueryBuilderContract<typeof PendingFriend>): void => {
                query.where('userId', from.id).andWhere('friendId', askingTo.id);
            })
            .preload('notification', (notificationQuery: ModelQueryBuilderContract<typeof PendingFriendNotification>): void => {
                notificationQuery.preload('from');
            })
            .preload('friend')
            .preload('user');
    }
}
