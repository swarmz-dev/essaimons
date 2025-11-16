import { createReadStream } from 'node:fs';
import type { Readable } from 'node:stream';
import { Agent as HttpsAgent } from 'node:https';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import type { StorageDriver } from './storage_driver.js';

interface S3DriverConfig {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
    forcePathStyle?: boolean;
}

export default class S3StorageDriver implements StorageDriver {
    private client: S3Client;

    constructor(private readonly config: S3DriverConfig) {
        // Create HTTPS agent that forces IPv4 to avoid IPv6 connectivity issues
        const agent = new HttpsAgent({
            family: 4, // Force IPv4
            timeout: 10000,
            keepAlive: true,
        });

        this.client = new S3Client({
            region: config.region,
            endpoint: config.endpoint,
            forcePathStyle: config.forcePathStyle,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
            requestHandler: {
                httpsAgent: agent,
                connectionTimeout: 10000,
                requestTimeout: 10000,
            },
        });
    }

    public async save(buffer: Buffer, { key, contentType }: { key: string; contentType?: string }): Promise<void> {
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.config.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
            })
        );
    }

    public async saveFromFileSystem(filePath: string, { key, contentType }: { key: string; contentType?: string }): Promise<void> {
        const stream = createReadStream(filePath);
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.config.bucket,
                Key: key,
                Body: stream,
                ContentType: contentType,
            })
        );
    }

    public async delete(key: string): Promise<void> {
        await this.client.send(
            new DeleteObjectCommand({
                Bucket: this.config.bucket,
                Key: key,
            })
        );
    }

    public async stream(key: string): Promise<{ stream: Readable; contentType?: string; contentLength?: number }> {
        try {
            const { Body, ContentType, ContentLength } = await this.client.send(
                new GetObjectCommand({
                    Bucket: this.config.bucket,
                    Key: key,
                })
            );

            return {
                stream: Body as Readable,
                contentType: ContentType ?? undefined,
                contentLength: typeof ContentLength === 'number' ? ContentLength : undefined,
            };
        } catch (error: any) {
            if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) {
                const notFoundError = new Error('FILE_NOT_FOUND');
                notFoundError.name = 'FileNotFoundError';
                throw notFoundError;
            }

            throw error;
        }
    }
}
