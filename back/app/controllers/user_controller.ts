import { inject } from '@adonisjs/core';
import { HttpContext } from '@adonisjs/core/http';
import UserRepository from '#repositories/user_repository';
import { getUsersValidator } from '#validators/user';
import cache from '@adonisjs/cache/services/main';
import PaginatedUsers from '#types/paginated/paginated_users';

@inject()
export default class UserController {
    constructor(private readonly userRepository: UserRepository) {}

    public async searchNotFriends({ request, response, user }: HttpContext) {
        const { query, page, limit } = await getUsersValidator.validate(request.params());

        return response.ok({
            users: await cache.getOrSet({
                key: `not-friends:${user.id}:query:${query}:page:${page}:limit:${limit}`,
                tags: ['not-friends', `not-friends:${user.id}`],
                ttl: '1h',
                factory: async (): Promise<PaginatedUsers> => {
                    return await this.userRepository.searchNotFriends(query ?? '', page ?? 1, limit ?? 10, user);
                },
            }),
        });
    }
}
