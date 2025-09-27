import File from '#models/file';
import storageManager from '#services/storage/storage_manager';
import type { StorageDriver } from '#services/storage/storage_driver';
import { fileTypeFromBuffer, type FileTypeResult } from 'file-type';
import axios from 'axios';
import { cuid } from '@adonisjs/core/helpers';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import mime from 'mime-types';
import type { MultipartFile } from '@adonisjs/bodyparser/types';

interface StoredFileMeta {
    key: string;
    size: number;
    mimeType?: string;
}

export default class FileService {
    private driver: StorageDriver = storageManager.driver;

    public async delete(file: File | null | undefined): Promise<void> {
        if (!file?.path) {
            return;
        }

        try {
            await this.driver.delete(file.path);
        } catch (error) {
            console.error('file.delete.error', error);
        }
    }

    public async stream(key: string) {
        try {
            return await this.driver.stream(key);
        } catch (error: any) {
            if (error?.name === 'FileNotFoundError' || error?.message === 'FILE_NOT_FOUND') {
                const notFoundError = new Error('FILE_NOT_FOUND');
                notFoundError.name = 'FileNotFoundError';
                throw notFoundError;
            }

            throw error;
        }
    }

    public async storeMultipartFile(file: MultipartFile, key: string, contentType?: string): Promise<StoredFileMeta> {
        if (!file.tmpPath) {
            throw new Error('Uploaded file has no temporary path');
        }

        const resolvedContentType = contentType || file.headers?.['content-type'] || (file.type && file.subtype ? `${file.type}/${file.subtype}` : undefined) || mime.lookup(key) || undefined;

        await this.driver.saveFromFileSystem(file.tmpPath, {
            key,
            contentType: resolvedContentType,
        });

        await unlink(file.tmpPath).catch(() => {});

        return {
            key,
            size: file.size ?? 0,
            mimeType: typeof resolvedContentType === 'string' ? resolvedContentType : undefined,
        };
    }

    public async saveBuffer(buffer: Buffer, key: string, contentType?: string): Promise<void> {
        await this.driver.save(buffer, { key, contentType });
    }

    public async saveOauthProfilePictureFromUrl(url: string): Promise<{
        key: string;
        size: number;
        mimeType: string;
        extension: string;
        name: string;
    }> {
        const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        const fileType: FileTypeResult | undefined = await fileTypeFromBuffer(buffer);
        if (!fileType) {
            throw new Error('Unable to detect file type');
        }

        const filename = `${cuid()}-${Date.now()}.${fileType.ext}`;
        const key = `profile-picture/${filename}`;

        await this.saveBuffer(buffer, key, fileType.mime);

        return {
            key,
            size: buffer.length,
            mimeType: fileType.mime,
            extension: `.${fileType.ext}`,
            name: filename,
        };
    }
}
