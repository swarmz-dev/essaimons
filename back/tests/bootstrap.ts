process.env.STORAGE_DRIVER = process.env.STORAGE_DRIVER ?? 'local';
process.env.STORAGE_LOCAL_BASE_PATH = process.env.STORAGE_LOCAL_BASE_PATH ?? 'tmp/test-storage';

import { assert } from '@japa/assert';
import { apiClient } from '@japa/api-client';
import app from '@adonisjs/core/services/app';
import type { Config } from '@japa/runner/types';
import { pluginAdonisJS } from '@japa/plugin-adonisjs';
import testUtils from '@adonisjs/core/services/test_utils';
import env from '#start/env';

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [assert(), apiClient(), pluginAdonisJS(app)];

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
    setup: [
        () => {
            const nodeEnv = env.get('NODE_ENV');
            if (nodeEnv !== 'test') {
                throw new Error(`Refusing to run tests with NODE_ENV="${nodeEnv}". Tests must run against a dedicated test environment.`);
            }

            const resolveDbName = () => env.get('DB_DATABASE_TEST', env.get('DB_DATABASE'));
            const resolveLogsDbName = () => env.get('LOGS_DB_DATABASE_TEST', env.get('LOGS_DB_DATABASE'));

            const databaseName = resolveDbName();
            const logsDatabaseName = resolveLogsDbName();

            const looksLikeTestDb = (name: string): boolean => name.toLowerCase().includes('test');

            if (!looksLikeTestDb(databaseName)) {
                throw new Error(`Safety check failed: the main database "${databaseName}" does not look like a test database.`);
            }

            if (!looksLikeTestDb(logsDatabaseName)) {
                throw new Error(`Safety check failed: the logs database "${logsDatabaseName}" does not look like a test database.`);
            }
        },
    ],
    teardown: [],
};

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
    if (['browser', 'functional', 'e2e'].includes(suite.name)) {
        return suite.setup(() => testUtils.httpServer().start());
    }
};
