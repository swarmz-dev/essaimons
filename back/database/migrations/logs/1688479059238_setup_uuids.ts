import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    public async up(): Promise<void> {
        this.schema.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    }

    public async down(): Promise<void> {
        this.schema.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
    }
}
