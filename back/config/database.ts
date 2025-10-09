import env from '#start/env';
import { defineConfig } from '@adonisjs/lucid';
import { DatabaseConfig } from '@adonisjs/lucid/types/database';

const isTestEnvironment = env.get('NODE_ENV') === 'test';

const resolveAppDatabase = (): string => {
    if (isTestEnvironment) {
        return env.get('DB_DATABASE_TEST', env.get('DB_DATABASE'));
    }
    return env.get('DB_DATABASE');
};

const resolveLogsDatabase = (): string => {
    if (isTestEnvironment) {
        return env.get('LOGS_DB_DATABASE_TEST', env.get('LOGS_DB_DATABASE'));
    }
    return env.get('LOGS_DB_DATABASE');
};

const dbConfig: DatabaseConfig = defineConfig({
    connection: 'app',
    connections: {
        app: {
            client: 'pg',
            connection: {
                host: env.get('DB_HOST'),
                port: env.get('DB_PORT'),
                user: env.get('DB_USER'),
                password: env.get('DB_PASSWORD'),
                database: resolveAppDatabase(),
            },
            pool: {
                min: 2,
                max: 10,
                acquireTimeoutMillis: 30000,
                idleTimeoutMillis: 30000,
                reapIntervalMillis: 1000,
            },
            migrations: {
                naturalSort: true,
                paths: ['database/migrations/app'],
            },
        },
        logs: {
            client: 'pg',
            connection: {
                host: env.get('DB_HOST'),
                port: env.get('DB_PORT'),
                user: env.get('LOGS_DB_USER'),
                password: env.get('LOGS_DB_PASSWORD'),
                database: resolveLogsDatabase(),
            },
            pool: {
                min: 2,
                max: 10,
                acquireTimeoutMillis: 30000,
                idleTimeoutMillis: 30000,
                reapIntervalMillis: 1000,
            },
            migrations: {
                naturalSort: true,
                paths: ['database/migrations/logs'],
            },
        },
    },
});

export default dbConfig;
