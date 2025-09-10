#!/bin/bash
set -a
source back/.env
set +a
docker compose "$@"
