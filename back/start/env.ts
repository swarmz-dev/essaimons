/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env';

export default await Env.create(new URL('../', import.meta.url), {
    PORT: Env.schema.number(),
    HOST: Env.schema.string({ format: 'host' }),
    NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
    APP_KEY: Env.schema.string(),
    LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),

    DOMAIN: Env.schema.string(),

    /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
    DB_CONNECTION: Env.schema.enum(['pg', 'mysql']),

    /*
  |----------------------------------------------------------
  | Variables for configuring main app database
  |----------------------------------------------------------
  */
    DB_HOST: Env.schema.string({ format: 'host' }),
    DB_PORT: Env.schema.number(),
    DB_USER: Env.schema.string(),
    DB_PASSWORD: Env.schema.string.optional(),
    DB_DATABASE: Env.schema.string(),

    /*
  |----------------------------------------------------------
  | Variables for configuring log database
  |----------------------------------------------------------
  */
    LOGS_DB_USER: Env.schema.string(),
    LOGS_DB_PASSWORD: Env.schema.string.optional(),
    LOGS_DB_DATABASE: Env.schema.string(),

    /*
  |----------------------------------------------------------
  | Variables for configuring ally package
  |----------------------------------------------------------
  */
    DISCORD_CLIENT_ID: Env.schema.string(),
    DISCORD_CLIENT_SECRET: Env.schema.string(),

    FRONT_PORT: Env.schema.number(),
    GITHUB_REPOSITORY: Env.schema.string(),
    ACCOUNT_SENDER_EMAIL: Env.schema.string(),
    BREVO_API_KEY: Env.schema.string(),
    ADMIN_EMAIL: Env.schema.string(),
    ADDITIONAL_EMAILS: Env.schema.string(),

    FRONT_URI: Env.schema.string(), // injected by Docker
    API_URI: Env.schema.string(), // injected by Docker
    MAIL_MOCK: Env.schema.boolean.optional(),

    STORAGE_DRIVER: Env.schema.enum.optional(['local', 's3'] as const),
    STORAGE_LOCAL_BASE_PATH: Env.schema.string.optional(),
    STORAGE_S3_BUCKET: Env.schema.string.optional(),
    STORAGE_S3_REGION: Env.schema.string.optional(),
    STORAGE_S3_ACCESS_KEY: Env.schema.string.optional(),
    STORAGE_S3_SECRET_KEY: Env.schema.string.optional(),
    STORAGE_S3_ENDPOINT: Env.schema.string.optional(),
    STORAGE_S3_FORCE_PATH_STYLE: Env.schema.boolean.optional(),
});
