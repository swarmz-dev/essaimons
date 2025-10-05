import { DateTime } from 'luxon';
import { BaseModel, column } from '@adonisjs/lucid/orm';
import type { SerializedEmailTemplate } from '#types/serialized/serialized_email_template';

export default class EmailTemplate extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare key: string;

    @column()
    declare name: string;

    @column()
    declare description: string | null;

    @column({
        prepare: (value: Record<string, string>) => JSON.stringify(value),
        consume: (value: string) => JSON.parse(value),
    })
    declare subjects: Record<string, string>;

    @column({
        prepare: (value: Record<string, string>) => JSON.stringify(value),
        consume: (value: string) => JSON.parse(value),
    })
    declare htmlContents: Record<string, string>;

    @column({
        prepare: (value: Record<string, string> | null) => (value ? JSON.stringify(value) : null),
        consume: (value: string | null) => (value ? JSON.parse(value) : {}),
    })
    declare textContents: Record<string, string> | null;

    @column()
    declare isActive: boolean;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    public apiSerialize(): SerializedEmailTemplate {
        return {
            id: this.id,
            key: this.key,
            name: this.name,
            description: this.description,
            subjects: this.subjects,
            htmlContents: this.htmlContents,
            textContents: this.textContents || {},
            isActive: this.isActive,
            createdAt: this.createdAt.toString(),
            updatedAt: this.updatedAt.toString(),
        };
    }
}
