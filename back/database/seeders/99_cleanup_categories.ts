import BaseSeeder from '@adonisjs/lucid/seeders';
import { Database } from '@adonisjs/lucid/database';

export default class CleanupCategoriesSeeder extends BaseSeeder {
    public static environment = ['development'];

    public async run() {
        await Database.from('proposition_category_pivot').delete();
        await Database.from('propositions').delete();
        await Database.from('proposition_categories').delete();

        await Database.table('proposition_categories').insert([{ name: 'Catégorie 1' }, { name: 'Catégorie 2' }]);
    }
}
