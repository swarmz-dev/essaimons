import BaseRepository from '#repositories/base/base_repository';
import UserToken from '#models/user_token';
import UserTokenTypeEnum from '#types/enum/user_token_type_enum';

export default class UserTokenRepository extends BaseRepository<typeof UserToken> {
    constructor() {
        super(UserToken);
    }

    public async findOneByEmailAndType(email: string, type: UserTokenTypeEnum): Promise<UserToken | null> {
        return this.Model.query().select('user_tokens.*').leftJoin('users', 'user_tokens.user_id', 'users.id').where('user_tokens.type', type).andWhere('users.email', email).preload('user').first();
    }
}
