import { inject } from '@adonisjs/core';
import { HttpContext } from '@adonisjs/core/http';
import cache from '@adonisjs/cache/services/main';
import app from '@adonisjs/core/services/app';
import File from '#models/file';
import path from 'node:path';
import FileTypeEnum from '#types/enum/file_type_enum';
import FileService from '#services/file_service';
import { MultipartFile } from '@adonisjs/bodyparser/types';
import UserRepository from '#repositories/user_repository';
import { createUserValidator, deleteUsersValidator, getAdminUserValidator, searchAdminUsersValidator, updateUserValidator } from '#validators/admin/user';
import User from '#models/user';
import { cuid } from '@adonisjs/core/helpers';
import SlugifyService from '#services/slugify_service';
import PaginatedUsers from '#types/paginated/paginated_users';
import SerializedUser from '#types/serialized/serialized_user';

@inject()
export default class AdminUserController {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly fileService: FileService,
        private readonly slugifyService: SlugifyService
    ) {}

    public async getAll({ request, response }: HttpContext) {
        const { query, page, limit, sortBy: inputSortBy } = await request.validateUsing(searchAdminUsersValidator);

        return response.ok(
            await cache.getOrSet({
                key: `admin-users:query:${query}:page:${page}:limit:${limit}:sortBy:${inputSortBy}`,
                tags: [`admin-users`],
                ttl: '1h',
                factory: async (): Promise<PaginatedUsers> => {
                    const [field, order] = inputSortBy.split(':');
                    const sortBy = { field: field as keyof User['$attributes'], order: order as 'asc' | 'desc' };

                    return await this.userRepository.getAdminUsers(query, page, limit, sortBy);
                },
            })
        );
    }

    public async delete({ request, response, i18n, user }: HttpContext) {
        const { users } = await request.validateUsing(deleteUsersValidator);

        const statuses: { isDeleted: boolean; isCurrentUser?: boolean; username?: string; frontId: number; id?: string }[] = await this.userRepository.delete(users, user);

        return response.ok({
            messages: await Promise.all(
                statuses.map(
                    async (status: { isDeleted: boolean; isCurrentUser?: boolean; username?: string; frontId: number; id?: string }): Promise<{ id: number; message: string; isSuccess: boolean }> => {
                        if (status.isDeleted) {
                            // TODO: Delete related friends, pending friends, blocked users & delete more granularly cache
                            await cache.deleteByTag({ tags: ['admin-users', `admin-user:${status.id}`, 'not-friends', 'blocked-users', 'friends', 'pending-friends'] });
                            return { id: status.frontId, message: i18n.t(`messages.admin.user.delete.success`, { username: status.username }), isSuccess: true };
                        } else {
                            if (status.isCurrentUser) {
                                return { id: status.frontId, message: i18n.t(`messages.admin.user.delete.error.current`, { username: status.username }), isSuccess: false };
                            } else {
                                return { id: status.frontId, message: i18n.t(`messages.admin.user.delete.error.default`, { frontId: status.frontId }), isSuccess: false };
                            }
                        }
                    }
                )
            ),
        });
    }

    public async create({ request, response, i18n }: HttpContext) {
        const { username, email, profilePicture: inputProfilePicture } = await request.validateUsing(createUserValidator);

        let user: User | null = await this.userRepository.findOneBy({ email });
        if (user) {
            return response.badRequest({ error: i18n.t('messages.admin.user.create.error.already-exists', { email }) });
        }

        let profilePicture: File | undefined = undefined;
        if (inputProfilePicture) {
            profilePicture = await this.processInputProfilePicture(inputProfilePicture);
        }

        user = await User.create({
            username,
            email,
            profilePictureId: profilePicture?.id,
            password: cuid(),
        });

        await user.refresh();

        const promises: any[] = [cache.deleteByTag({ tags: ['not-friends', 'admin-users'] })];

        if (profilePicture) {
            promises.push(user.load('profilePicture'));
        }

        await Promise.all(promises);

        return response.created({ user: user.apiSerialize(), message: i18n.t('messages.admin.user.create.success', { email, username }) });
    }

    public async update({ request, response, i18n }: HttpContext) {
        const { username, email, profilePicture: inputProfilePicture } = await request.validateUsing(updateUserValidator);

        const user: User = await this.userRepository.firstOrFail({ email });

        user.username = username;

        if (inputProfilePicture) {
            if (user.profilePicture && !this.areSameFiles(user.profilePicture, inputProfilePicture)) {
                this.fileService.delete(user.profilePicture);
            }
            const profilePicture: File = await this.processInputProfilePicture(inputProfilePicture);
            user.profilePictureId = profilePicture.id;
            await cache.delete({ key: `user-profile-picture:${user.id}` });
        }

        await user.save();

        if (inputProfilePicture && user.profilePicture && !this.areSameFiles(user.profilePicture, inputProfilePicture)) {
            await user.profilePicture.delete();
        }

        await Promise.all([user.load('profilePicture'), cache.deleteByTag({ tags: ['not-friends', 'blocked-users', 'friends', 'pending-friends', 'admin-users', `admin-user:${user.id}`] })]);

        return response.ok({ user: user.apiSerialize(), message: i18n.t('messages.admin.user.update.success', { username }) });
    }

    public async get({ request, response }: HttpContext) {
        const { frontId } = await getAdminUserValidator.validate(request.params());
        const user: User = await this.userRepository.firstOrFail({ frontId });

        return response.ok(
            await cache.getOrSet({
                key: `admin-user:${user.id}`,
                tags: [`admin-user:${user.id}`],
                ttl: '1h',
                factory: (): SerializedUser => {
                    return user.apiSerialize();
                },
            })
        );
    }

    private async processInputProfilePicture(inputProfilePicture: MultipartFile): Promise<File> {
        const extension: string = path.extname(inputProfilePicture.clientName);
        inputProfilePicture.clientName = `${cuid()}-${this.slugifyService.slugify(inputProfilePicture.clientName)}`;
        const profilePicturePath: string = `static/profile-picture`;
        await inputProfilePicture.move(app.makePath(profilePicturePath));
        const flag: File = await File.create({
            name: inputProfilePicture.clientName,
            path: `${profilePicturePath}/${inputProfilePicture.clientName}`,
            extension,
            mimeType: `${inputProfilePicture.type}/${inputProfilePicture.subtype}`,
            size: inputProfilePicture.size,
            type: FileTypeEnum.PROFILE_PICTURE,
        });

        return await flag.refresh();
    }

    private areSameFiles(file: File, multipartFile: MultipartFile): boolean {
        return (
            file.extension === path.extname(multipartFile.clientName) &&
            file.mimeType === `${multipartFile.type}/${multipartFile.subtype}` &&
            file.size === multipartFile.size &&
            file.type === multipartFile.type
        );
    }
}
