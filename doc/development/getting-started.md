# Essaimons-V1 Getting Started

---

### 1) Clone the repository

```bash
  git clone https://codeberg.org/la-ruche/Essaimons_V1.git
```

---

### 2) Create `.env` files

For this part, refer to the [environment variables](environment.md) documentation.

---

### 3) Make sure you have the right NodeJs version
```bash
    node --version
```

You should have Node.js >= 20.6 installed. If you don't have it installed, you can follow the official [Node.js installation guide](https://nodejs.org/en/download/).

We strongly recommend using [nvm](https://github.com/nvm-sh/nvm) to manage your Node.js versions.

### 4) Make sure you have Docker and the `compose` plugin installed

```bash
    which docker
    docker compose version
```

- If you don't have Docker installed, you can follow the official [Docker installation guide](https://docs.docker.com/get-docker/).
- If you don't have the `compose` plugin installed, you can follow the official [Docker Compose installation guide](https://docs.docker.com/compose/install/).
- If you are on a Linux system and don't have docker rights, you can follow the official [Docker post-installation steps](https://docs.docker.com/engine/install/linux-postinstall/).

---

### 5) Make `.sh` files executable

```bash
    chmod +x ./*.sh
```

---

### 6) Make sure you have `make` installed

```bash
    which make
```

If you don't have `make` installed, you can follow the official [GNU Make installation guide](https://www.gnu.org/software/make/).

---

### 7) Start the application

```bash
    make start
```

This command will build and start the application in detached mode. It will also reset and seed the database.

---

### 8) Access the application

You can access the application at http://localhost:5173.

---

### Local deployment on Linux without Docker

If you prefer running the stack directly on your host machine instead of Docker, follow the steps below.

#### Prerequisites

- Node.js >= 20.6 (see step 3 for installation guidance).
- Project dependencies installed with workspace support.
- PostgreSQL service (optional – install if you prefer running the database locally instead of through Docker or a managed instance).
- Redis service (optional – install if you plan to use features backed by Redis).

On Debian/Ubuntu machines you can install and start the optional services with:

```bash
  sudo apt install postgresql redis
  sudo systemctl enable --now postgresql redis-server
```

#### Setup

1. Install monorepo dependencies from the repository root:

    ```bash
      npm install
    ```

2. Provision application environment files (see step 2). If you run PostgreSQL or Redis locally, point the backend `.env` to those instances; otherwise keep using the defaults that target the Docker compose services or a managed deployment. Skipping Redis leaves Redis-backed features unavailable until a server is provided. When iterating locally you can set `MAIL_MOCK=true` to log outgoing emails instead of calling Brevo.

3. Run database migrations (and seeds if required):

    ```bash
      cd back
      node ace migration:run
      node ace migration:run --connection logs
      node ace db:seed # optional
    ```

4. Mirror the Docker bind mount that exposes backend types to the frontend:

    ```bash
      mkdir -p front/back/app
      ln -s "$(realpath back/app/types)" front/back/app/types
    ```

#### Run services

Start the backend and frontend in separate terminals from the repository root:

- Backend:

    ```bash
      npm run dev --workspace back
    ```

- Frontend:

    ```bash
      npm run dev --workspace front
    ```

If you edit the translation JSON files or add new keys, regenerate the Paraglide runtime before restarting the frontend dev server:

```bash
  cd front
  npx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide
```

The frontend runs on http://localhost:5173 and communicates with the backend port defined in `back/.env` (default http://localhost:3333).

---

### Development index documentation

&larr; [Back to index](index.md)
