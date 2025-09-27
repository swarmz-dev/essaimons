import type { Readable } from 'node:stream';

export interface StorageDriver {
    save(buffer: Buffer, options: { key: string; contentType?: string }): Promise<void>;
    saveFromFileSystem(filePath: string, options: { key: string; contentType?: string }): Promise<void>;
    delete(key: string): Promise<void>;
    stream(key: string): Promise<{ stream: Readable; contentType?: string; contentLength?: number }>;
}
