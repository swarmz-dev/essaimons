import env from '#start/env';
import LocalStorageDriver from './local_storage_driver.js';
import S3StorageDriver from './s3_storage_driver.js';
import type { StorageDriver } from './storage_driver.js';

export type StorageDriverName = 'local' | 's3';

interface StorageConfig {
    driver: StorageDriverName;
    local: {
        basePath: string;
    };
    s3: {
        bucket: string;
        region: string;
        accessKeyId: string;
        secretAccessKey: string;
        endpoint?: string;
        forcePathStyle?: boolean;
    };
}

const storageConfig: StorageConfig = {
    driver: env.get('STORAGE_DRIVER', 'local' as StorageDriverName),
    local: {
        basePath: env.get('STORAGE_LOCAL_BASE_PATH', 'static'),
    },
    s3: {
        bucket: env.get('STORAGE_S3_BUCKET', ''),
        region: env.get('STORAGE_S3_REGION', ''),
        accessKeyId: env.get('STORAGE_S3_ACCESS_KEY', ''),
        secretAccessKey: env.get('STORAGE_S3_SECRET_KEY', ''),
        endpoint: env.get('STORAGE_S3_ENDPOINT', undefined),
        forcePathStyle: env.get('STORAGE_S3_FORCE_PATH_STYLE', false),
    },
};

let driver: StorageDriver;

if (storageConfig.driver === 's3') {
    const { bucket, region, accessKeyId, secretAccessKey } = storageConfig.s3;
    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
        throw new Error('S3 storage driver selected but configuration is incomplete');
    }
    driver = new S3StorageDriver(storageConfig.s3);
} else {
    driver = new LocalStorageDriver(storageConfig.local.basePath);
}

export const storageManager = {
    driver,
    config: storageConfig,
};

export default storageManager;
