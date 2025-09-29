# Essaimons-V1 - Development Environment Variables

---

### Development backend .env (back/.env)

Note that `FRONT_URI` and `API_URI` are automatically generated from `FRONT_PORT` and `PORT` backend environment variables respectively by Docker.

```
PORT=3333
HOST=0.0.0.0
NODE_ENV=development
APP_KEY=
LOG_LEVEL=debug

DB_CONNECTION=pg

DB_HOST=db
DB_PORT=5432
DB_USER=superadmin
DB_PASSWORD=xxx
DB_DATABASE=essaimons_db
# DB_DATABASE_TEST=essaimons_db_test

LOGS_DB_USER=superadmin
LOGS_DB_PASSWORD=xxx
LOGS_DB_DATABASE=essaimons_db_logs
# LOGS_DB_DATABASE_TEST=essaimons_db_logs_test

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

FRONT_PORT=5173
GITHUB_REPOSITORY=https://codeberg.org/la-ruche/Essaimons_V1
ACCOUNT_SENDER_EMAIL=account@essaimons.fr
BREVO_API_KEY=
ADMIN_EMAIL=
ADDITIONAL_EMAILS=[]

FRONT_URI=""
API_URI=""
```

| Variable                | Value                                                                       |
|-------------------------|-----------------------------------------------------------------------------|
| `PORT`                  | 3333                                                                        |
| `HOST`                  | 0.0.0.0                                                                     |
| `NODE_ENV`              | development                                                                 |
| `APP_KEY`               | **Run `cd back && node ace generate:key` to generate this field**           |
| `LOG_LEVEL`             | debug                                                                       |
| `DB_CONNECTION`         | pg                                                                          |
| `DB_HOST`               | db                                                                          |
| `DB_PORT`               | 5432                                                                        |
| `DB_USER`               | superadmin                                                                  |
| `DB_PASSWORD`           | xxx                                                                         |
| `DB_DATABASE`           | essaimons_db                                                                |
| `DB_DATABASE_TEST`      | essaimons_db_test *(used when running the automated test suite)*            |
| `LOG_DB_USER`           | superadmin                                                                  |
| `LOG_DB_PASSWORD`       | xxx                                                                         |
| `LOG_DB_DATABASE`       | essaimons_db_logs                                                           |
| `LOGS_DB_DATABASE_TEST` | essaimons_db_logs_test *(used when running the automated test suite)*       |
| `REDIS_HOST`            | 127.0.0.1                                                                   |
| `REDIS_PORT`            | 6379                                                                        |
| `REDIS_PASSWORD`        |                                                                             |
| `REDIS_DB`              | 0                                                                           |
| `DISCORD_CLIENT_ID`     | **`A valid Discord client ID`**                                             |
| `DISCORD_CLIENT_SECRET` | **`A valid Discord client secret`**                                         |
| `GITHUB_CLIENT_ID`      | **`A valid GitHub client ID`**                                              |
| `GITHUB_CLIENT_SECRET`  | **`A valid GitHub client secret`**                                          |
| `GOOGLE_CLIENT_ID`      | **`A valid Google client ID`**                                              |
| `GOOGLE_CLIENT_SECRET`  | **`A valid Google client secret`**                                          |
| `FRONT_PORT`            | 5173                                                                        |
| `GITHUB_REPOSITORY`     | https://codeberg.org/la-ruche/Essaimons_V1                                  |
| `ACCOUNT_SENDER_EMAIL`  | account@essaimons.fr                                                        |
| `BREVO_API_KEY`         | **`A valid Brevo API key`**                                                 |
| `ADMIN_EMAIL`           | **`Put your email here`**                                                   |
| `ADDITIONAL_EMAILS`     | [] **Feel free to add other emails to create other users or test emailing** |
| `FRONT_URI`             | "" **`Injected from Docker`**                                               |
| `API_URI`               | "" **`Injected from Docker`**                                               |

---

### Development frontend .env (front/.env)

Note that `PUBLIC_FRONT_URI` and `PUBLIC_API_BASE_URI` are automatically generated from `FRONT_PORT` and `PORT` backend environment variables respectively by Docker.

`PORT` and `PUBLIC_GITHUB_REPOSITORY` are also injected from backend environment variables.

```
PORT=""
PUBLIC_FRONT_URI=""
PUBLIC_API_BASE_URI=""
PUBLIC_API_REAL_URI=""
PUBLIC_GITHUB_REPOSITORY=""
PUBLIC_DEFAULT_IMAGE=/default/image.png
PUBLIC_TWITTER_HANDLE=""
```

| Variable                   | Value                                                     |
|----------------------------|-----------------------------------------------------------|
| `PORT`                     | ""                                                        |
| `PUBLIC_FRONT_URI`         | ""                                                        |
| `PUBLIC_API_BASE_URI`      | ""                                                        |
| `PUBLIC_API_REAL_URI`      | ""                                                        |
| `PUBLIC_GITHUB_REPOSITORY` | ""                                                        |
| `PUBLIC_DEFAULT_IMAGE`     | /default/image.png                                        |
| `PUBLIC_TWITTER_HANDLE`    | **`Put your twitter @ here, for example : @Tassadar921`** |

---

### Development index documentation

&larr; [Back to index](index.md)
