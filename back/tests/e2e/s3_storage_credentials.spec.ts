import { test } from '@japa/runner';
import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const isS3Driver = (process.env.STORAGE_DRIVER ?? '').toLowerCase() === 's3';
const requiredEnvVars = ['STORAGE_S3_BUCKET', 'STORAGE_S3_REGION', 'STORAGE_S3_ACCESS_KEY', 'STORAGE_S3_SECRET_KEY'];
const missingVar = requiredEnvVars.find((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0 || value === 'todo';
});

test.group('S3 storage credentials', (group) => {
    group.tap((testRef) => {
        testRef.skip(!isS3Driver || !!missingVar, missingVar ? `S3 environment variable ${missingVar} is not configured` : 'STORAGE_DRIVER is not set to "s3"');
    });

    test('uploads and deletes a file using configured S3 credentials', async ({ assert }) => {
        const bucket = process.env.STORAGE_S3_BUCKET as string;
        const region = process.env.STORAGE_S3_REGION as string;
        const accessKeyId = process.env.STORAGE_S3_ACCESS_KEY as string;
        const secretAccessKey = process.env.STORAGE_S3_SECRET_KEY as string;
        const endpoint = process.env.STORAGE_S3_ENDPOINT;
        const forcePathStyleRaw = process.env.STORAGE_S3_FORCE_PATH_STYLE;
        const forcePathStyle = typeof forcePathStyleRaw === 'string' ? forcePathStyleRaw.toLowerCase() === 'true' : Boolean(forcePathStyleRaw);

        const client = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            ...(endpoint ? { endpoint } : {}),
            ...(forcePathStyle ? { forcePathStyle } : {}),
        });

        const key = `health-check/${randomUUID()}.txt`;
        const body = 'S3 credentials health check';

        let putResponse;
        try {
            putResponse = await client.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: body,
                })
            );
        } catch (error: any) {
            assert.fail(`Uploading test object to S3 failed: ${error?.message ?? error}`);
            return;
        }

        assert.include([200, 201, 204], putResponse?.$metadata?.httpStatusCode ?? 0);

        try {
            await client.send(
                new DeleteObjectCommand({
                    Bucket: bucket,
                    Key: key,
                })
            );
        } catch (error: any) {
            assert.fail(`Uploaded test object could not be deleted: ${error?.message ?? error}`);
        }
    });
});
