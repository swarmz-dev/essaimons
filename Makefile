SHELL := /bin/bash

.PHONY: format format-check install upgrade list-routes db-fresh db-migrate db-seed init-logs-db db paraglide stop up rm prune build-prod migrate-prod start-prod deploy

format:
	node ./format/command.js

format-check:
	node ./format/command.js --check

install:
	rm -rf node_modules package-lock.json back/node_modules front/node_modules
	npm install

upgrade:
	cd back && npx ncu -u
	cd front && npx ncu -u
	${MAKE} install

list-routes:
	cd back && node ace list:routes

db-fresh:
	./compose-env.sh exec -T backend node ace migration:fresh
	./compose-env.sh exec -T backend node ace migration:fresh --connection=logs

db-migrate:
	./compose-env.sh exec -T backend node ace migration:run
	./compose-env.sh exec -T backend node ace migration:run --connection=logs

db-seed:
	./compose-env.sh exec -T backend node ace db:seed

init-logs-db:
	./init-logs-db.sh

db: init-logs-db db-fresh db-seed

paraglide:
	cd front && npx paraglide-js compile

stop:
	./compose-env.sh down --remove-orphans

up:
	${MAKE} stop
	rm -rf front/node_modules/.vite
	${MAKE} paraglide
	npx simple-git-hooks
	./compose-env.sh up -d --build

rm:
	./compose-env.sh down --volumes --remove-orphans

start: install rm up db

prune:
	docker system prune -f

build-prod:
	# Temporary persisted directories creation
	mkdir -p back/.persist
	[ -d back/build/public ] && cp -r back/build/public back/.persist/public || true
	[ -d back/build/static ] && cp -r back/build/static back/.persist/static || true

	# Backend build
	cd back && npm install && npm run build && cp .env build/.env && cd build && npm install --omit=dev

	# Persisted directories restoration
	[ -d back/.persist/public ] && cp -r back/.persist/public back/build/ || true
	[ -d back/.persist/static ] && cp -r back/.persist/static/* back/build/static/ || true

	# Fixture clearing
	mkdir -p back/build/static
	cp -r back/static/* back/build/static/

	# Clear temporary persisted directories
	rm -rf back/.persist

	# Frontend build
	cd front && npm install && npm run build

migrate-prod:
	cd back && node ace migration:run && node ace migration:run --connection=logs

start-prod:
	pm2 describe adonis-svelte-starter-kit-backend > /dev/null
	pm2 restart adonis-svelte-starter-kit-backend || pm2 start back/build/bin/server.js --name adonis-svelte-starter-kit-backend

deploy: build-prod migrate-prod start-prod
