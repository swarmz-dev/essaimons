import { BaseSeeder } from '@adonisjs/lucid/seeders';
import PropositionCategory from '#models/proposition_category';

export default class extends BaseSeeder {
    public async run(): Promise<void> {
        const categories = ['Démocratie liquide', 'Outils numériques', 'Mobilisation citoyenne', 'Communication citoyenne', 'Formation & accompagnement', 'Suivi & évaluation'];

        for (const name of categories) {
            await PropositionCategory.firstOrCreate({ name }, { name });
        }
    }
}
