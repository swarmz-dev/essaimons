import BaseRepository from '#repositories/base/base_repository';
import Log from '#models/log';
import User from '#models/user';

export default class LogRepository extends BaseRepository<typeof Log> {
    constructor() {
        super(Log);
    }

    public async deleteByUser(user: User): Promise<void> {
        await this.Model.query().select('logs.*').leftJoin('log_users', 'logs.user_id', 'logs.id').where('log_users.email', user.email).delete();
    }
}
