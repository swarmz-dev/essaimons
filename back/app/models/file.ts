import { DateTime } from 'luxon';
import { BaseModel, column } from '@adonisjs/lucid/orm';
import SerializedFile from '#types/serialized/serialized_file';
import FileTypeEnum from '#types/enum/file_type_enum';

export default class File extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare name: string;

    @column()
    declare path: string;

    @column()
    declare extension: string;

    @column()
    declare mimeType: string;

    // File size in bytes
    @column()
    declare size: number;

    @column()
    declare type: FileTypeEnum;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    public apiSerialize(): SerializedFile {
        return {
            name: this.name,
            path: this.path,
            extension: this.extension,
            mimeType: this.mimeType,
            size: this.size,
            type: this.type,
            createdAt: this.createdAt?.toString(),
            updatedAt: this.updatedAt?.toString(),
        };
    }
}
