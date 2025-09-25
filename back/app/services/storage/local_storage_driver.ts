import { createReadStream } from 'node:fs';
import { mkdir, unlink, copyFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import mime from 'mime-types';
import type { Readable } from 'node:stream';
import app from '@adonisjs/core/services/app';
import type { StorageDriver } from './storage_driver.js';

export default class LocalStorageDriver implements StorageDriver {
    constructor(private readonly basePath: string = 'static') {}

    private resolve(key: string): string {
        const normalized = key.startsWith('/') ? key.slice(1) : key;
        const base = this.basePath.endsWith('/') ? this.basePath.slice(0, -1) : this.basePath;

        if (normalized.startsWith(`${base}/`)) {
            return app.makePath(normalized);
        }

        return app.makePath(base, normalized);
    }

    private async ensureDirectoryExists(filePath: string): Promise<void> {
        const dir = path.dirname(filePath);
        await mkdir(dir, { recursive: true });
    }

    public async save(buffer: Buffer, { key }: { key: string; contentType?: string }): Promise<void> {
        const fullPath: string = this.resolve(key);
        await this.ensureDirectoryExists(fullPath);
        await writeFile(fullPath, buffer);
    }

    public async saveFromFileSystem(tempPath: string, { key }: { key: string; contentType?: string }): Promise<void> {
        const fullPath: string = this.resolve(key);
        await this.ensureDirectoryExists(fullPath);
        await copyFile(tempPath, fullPath);
    }

    public async delete(key: string): Promise<void> {
        const fullPath: string = this.resolve(key);
        try {
            await unlink(fullPath);
        } catch (error: any) {
            if (error?.code !== 'ENOENT') {
                throw error;
            }
        }
    }

    public async stream(key: string): Promise<{ stream: Readable; contentType?: string; contentLength?: number }> {
        const fullPath: string = this.resolve(key);

        try {
            const stats = await stat(fullPath);
            const fileStream: Readable = createReadStream(fullPath);
            const contentType = mime.lookup(fullPath) || undefined;

            return { stream: fileStream, contentType, contentLength: stats.size };
        } catch (error: any) {
            if (error?.code === 'ENOENT') {
                const notFoundError = new Error('FILE_NOT_FOUND');
                notFoundError.name = 'FileNotFoundError';
                throw notFoundError;
            }

            throw error;
        }
    }
}
