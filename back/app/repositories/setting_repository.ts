import BaseRepository from '#repositories/base/base_repository';
import Setting from '#models/setting';
import { TransactionClientContract } from '@adonisjs/lucid/types/database';

export default class SettingRepository extends BaseRepository<typeof Setting> {
    constructor() {
        super(Setting);
    }

    public async findByKey(key: string, trx?: TransactionClientContract): Promise<Setting | null> {
        return trx ? this.Model.query({ client: trx }).where('key', key).first() : this.Model.findBy('key', key);
    }
}
