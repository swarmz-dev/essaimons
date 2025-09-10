import { DateTime } from 'luxon';
import hash from '@adonisjs/core/services/hash';
import { compose } from '@adonisjs/core/helpers';
import { afterCreate, beforeFind, beforeFetch, BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import SerializedUser from '#types/serialized/serialized_user';
import { AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens';
import File from '#models/file';
import UserRoleEnum from '#types/enum/user_role_enum';
import LogUser from '#models/log_user';

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
    uids: ['email'],
    passwordColumnName: 'password',
});

export default class User extends compose(BaseModel, AuthFinder) {
    public currentAccessToken?: AccessToken;

    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare frontId: number;

    @column()
    declare username: string;

    @column()
    declare email: string;

    @column()
    declare password: string;

    @column()
    declare role: UserRoleEnum;

    @column()
    declare enabled: boolean;

    @column()
    declare acceptedTermsAndConditions: boolean;

    @column()
    declare isOauth: boolean;

    @column()
    declare profilePictureId: string | null;

    @belongsTo((): typeof File => File, {
        foreignKey: 'profilePictureId',
    })
    declare profilePicture: BelongsTo<typeof File>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @afterCreate()
    static async createLogUser(user: User): Promise<void> {
        await LogUser.create({
            email: user.email,
        });
    }

    @beforeFind()
    @beforeFetch()
    public static preloadDefaults(userQuery: any): void {
        userQuery.preload('profilePicture');
    }

    static accessTokens: DbAccessTokensProvider<typeof User> = DbAccessTokensProvider.forModel(User, {
        expiresIn: '30 days',
        prefix: 'oat_',
        table: 'auth_access_tokens',
        type: 'auth_token',
        tokenSecretLength: 40,
    });

    public apiSerialize(): SerializedUser {
        return {
            id: this.frontId,
            username: this.username,
            email: this.email,
            role: this.role,
            enabled: this.enabled,
            acceptedTermsAndConditions: this.acceptedTermsAndConditions,
            profilePicture: this.profilePicture?.apiSerialize(),
            updatedAt: this.updatedAt?.toString(),
            createdAt: this.createdAt?.toString(),
        };
    }
}
