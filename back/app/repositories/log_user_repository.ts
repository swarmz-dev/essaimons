import BaseRepository from '#repositories/base/base_repository';
import LogUser from '#models/log_user';
import User from '#models/user';
import { inject } from '@adonisjs/core';
import LogRepository from '#repositories/log_repository';

@inject()
export default class LogUserRepository extends BaseRepository<typeof LogUser> {
    constructor(private readonly logRepository: LogRepository) {
        super(LogUser);
    }

    public async deleteByUser(user: User): Promise<void> {
        await this.logRepository.deleteByUser(user);
        await this.Model.query().where('email', user.email).delete();
    }
}
