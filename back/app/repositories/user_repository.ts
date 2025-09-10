import BaseRepository from '#repositories/base/base_repository';
import User from '#models/user';
import { ModelPaginatorContract, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model';
import PaginatedUsers from '#types/paginated/paginated_users';
import SerializedUser from '#types/serialized/serialized_user';
import { inject } from '@adonisjs/core';
import FileService from '#services/file_service';
import LogUserRepository from '#repositories/log_user_repository';

@inject()
export default class UserRepository extends BaseRepository<typeof User> {
    constructor(
        private readonly fileService: FileService,
        private readonly logUserRepository: LogUserRepository
    ) {
        super(User);
    }

    public async searchNotFriends(query: string, page: number, limit: number, user: User): Promise<PaginatedUsers> {
        const users: ModelPaginatorContract<User> = await this.Model.query()
            .select('users.*')
            .select('received_pending_friends.id as receivedPendingFriendId')
            .select('sent_pending_friends.id as sentPendingFriendId')
            .leftJoin('blocked_users as blocked', (blockedJoin): void => {
                blockedJoin
                    .on((builder): void => {
                        builder.on('users.id', '=', 'blocked.blocked_id').andOnVal('blocked.blocker_id', '=', user.id);
                    })
                    .orOn((builder): void => {
                        builder.on('users.id', '=', 'blocked.blocker_id').andOnVal('blocked.blocked_id', '=', user.id);
                    });
            })
            .leftJoin('friends', (friendJoin): void => {
                friendJoin.on('users.id', '=', 'friends.friend_id').andOnVal('friends.user_id', '=', user.id);
            })
            .leftJoin('pending_friends as received_pending_friends', (receivedJoin): void => {
                receivedJoin.on('users.id', '=', 'received_pending_friends.user_id').andOnVal('received_pending_friends.friend_id', '=', user.id);
            })
            .leftJoin('pending_friends as sent_pending_friends', (sentJoin): void => {
                sentJoin.on('users.id', '=', 'sent_pending_friends.friend_id').andOnVal('sent_pending_friends.user_id', '=', user.id);
            })
            .if(query, (queryBuilder): void => {
                queryBuilder.whereILike('users.username', `%${query}%`);
            })
            .whereNull('blocked.blocker_id')
            .whereNull('friends.user_id')
            .whereNot('users.id', user.id)
            .paginate(page, limit);

        return {
            users: await Promise.all(
                users.all().map((user: User): SerializedUser => {
                    return { ...user.apiSerialize(), receivedFriendRequest: !!user.$extras.receivedPendingFriendId, sentFriendRequest: !!user.$extras.sentPendingFriendId };
                })
            ),
            firstPage: users.firstPage,
            lastPage: users.lastPage,
            limit,
            total: users.total,
            currentPage: page,
        };
    }

    public async getAdminUsers(query: string, page: number, limit: number, sortBy: { field: keyof User['$attributes']; order: 'asc' | 'desc' }): Promise<PaginatedUsers> {
        const users: ModelPaginatorContract<User> = await this.Model.query()
            .if(query, (queryBuilder: ModelQueryBuilderContract<typeof User>): void => {
                queryBuilder.where('username', 'ILIKE', `%${query}%`).orWhere('email', 'ILIKE', `%${query}%`);
            })
            .if(sortBy, (queryBuilder: ModelQueryBuilderContract<typeof User>): void => {
                queryBuilder.orderBy(sortBy.field as string, sortBy.order);
            })
            .paginate(page, limit);

        return {
            users: users.all().map((user: User): SerializedUser => user.apiSerialize()),
            firstPage: users.firstPage,
            lastPage: users.lastPage,
            limit,
            total: users.total,
            currentPage: page,
        };
    }

    public async delete(frontIds: number[], currentUser: User): Promise<{ isDeleted: boolean; isCurrentUser?: boolean; username?: string; frontId: number; id?: string }[]> {
        // Delete some other things if needed
        return await Promise.all([
            ...frontIds.map(async (frontId: number): Promise<{ isDeleted: boolean; isCurrentUser?: boolean; username?: string; frontId: number; id?: string }> => {
                try {
                    const user: User = await this.Model.query().where('front_id', frontId).firstOrFail();
                    if (user.id === currentUser.id) {
                        return { isDeleted: false, isCurrentUser: true, username: user.username, frontId };
                    }

                    await user.delete();

                    if (user.profilePicture) {
                        this.fileService.delete(user.profilePicture);
                        await user.profilePicture.delete();
                    }

                    await this.logUserRepository.deleteByUser(user);

                    return { isDeleted: true, username: user.username, frontId, id: user.id };
                } catch (error: any) {
                    return { isDeleted: false, frontId };
                }
            }),
        ]);
    }
}
