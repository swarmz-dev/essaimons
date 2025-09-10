# Adonis & Svelte Starter Kit Development Commands

---

| Command              | Description                                                                                               |
|----------------------|-----------------------------------------------------------------------------------------------------------|
| `make format`        | Format code both in root, `format`, `front` and `back` directories using Prettier.                        |
| `make format-check`  | Checks code format both in root, `format`, `front` and `back` directories using Prettier.                 |
| `make install`       | Removes `node_modules`, `.vite` and `package-lock.json`. Then installs dependencies.                      |
| `make upgrade`       | Updates dependencies in both `front` and `back` directories.                                              |
| `make list-routes`   | List all routes defined in the backend using `node ace list:routes`.                                      |
| `make db-fresh`      | Run a fresh migration on both app & logs databases. **/!\\** **This call clear the previous databases**.  |
| `make db-migrate`    | Run pending migrations on both app & logs databases.                                                      |
| `make db-seed`       | Seed both app & logs databases with initial data using Docker.                                            |
| `make db`            | Runs `db-fresh` and `db-seed`.                                                                            |
| `make paraglide`     | Updates frontend translations.                                                                            |
| `make stop`          | Stops all Docker containers and removes orphans.                                                          |
| `make up`            | Stops containers and then builds and starts them in detached mode.                                        |
| `make rm`            | Fully stops and resets app Docker containers and volumes.                                                 |
| `make start`         | Runs `make install`, `make rm`, `make up` and `make db`                                                   |
| `make prune`         | **/!\\** Stops containers and prunes Docker system resources.                                             |

---

### Development index documentation

&larr; [Back to index](index.md)
