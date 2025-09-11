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
  | Variables for configuring redis package
  |----------------------------------------------------------
  */
    REDIS_HOST: Env.schema.string({ format: 'host' }),
    REDIS_PORT: Env.schema.number(),
    REDIS_PASSWORD: Env.schema.string.optional(),

    /*
  |----------------------------------------------------------
  | Variables for configuring ally package
  |----------------------------------------------------------
  */
    DISCORD_CLIENT_ID: Env.schema.string(),
    DISCORD_CLIENT_SECRET: Env.schema.string(),
    GITHUB_CLIENT_ID: Env.schema.string(),
    GITHUB_CLIENT_SECRET: Env.schema.string(),
    GOOGLE_CLIENT_ID: Env.schema.string(),
    GOOGLE_CLIENT_SECRET: Env.schema.string(),

    FRONT_PORT: Env.schema.number(),
    GITHUB_REPOSITORY: Env.schema.string(),
    ACCOUNT_SENDER_EMAIL: Env.schema.string(),
    BREVO_API_KEY: Env.schema.string(),
    ADMIN_EMAIL: Env.schema.string(),
    ADDITIONAL_EMAILS: Env.schema.string(),

    FRONT_URI: Env.schema.string(), // injected by Docker
    API_URI: Env.schema.string(), // injected by Docker
});
