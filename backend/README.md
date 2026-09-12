# Risovach backend

Backend на Bun + Elysia + SQLite.

## Запуск

```bash
# development: data/db.dev.sqlite
bun run dev

# tests: data/db.test.sqlite (схема применяется автоматически через drizzle-kit push)
bun test

# production: data/db.sqlite
NODE_ENV=production bun run src/index.server.ts
```

`DB_PATH` можно задать явно, но development/test не должны указывать на production-файл `data/db.sqlite`. Сервер проверяет это при запуске.

## Схема базы и миграции

Схема в `src/db/schema.db.ts` — источник истины. Отдельные файлы-миграции и таблица `__drizzle_migrations` не используются: схема применяется по требованию через drizzle-kit push.

```bash
# dev/test: применить текущую схему к активной БД (NODE_ENV-зависимо)
bun run db:migrate

# production: применить схему к прод-БД (спросит подтверждение при data-loss)
NODE_ENV=production bun run db:migrate
```

Для неинтерактивных сценариев (например тесты) используется `--force`:

```bash
NODE_ENV=test bunx drizzle-kit push --force
```

## Роли и админ

У пользователя есть роль: `user` (по умолчанию), `admin`, `subscriber` (зарезервирована, пока не используется). Роль задаётся колонкой `role` в таблице `users` и возвращается в публичных данных пользователя.

Выдача роли `admin` идемпотентно через seed. Команда интерактивно просит ID существующего пользователя и меняет его роль с текущей на `admin`:

```bash
bun run db:seed

# production требует явный флаг
NODE_ENV=production bun run db:seed -- --confirm-production-data
```

## Копирование production в development

Команда работает только с локальным SQLite-файлом и не запускается с `NODE_ENV=production`:

```bash
bun run db:clone:full -- \
  --source data/db.sqlite \
  --confirm-production-data \
  --replace
```

Источник также можно задать через `PROD_DB_PATH`, а destination — через `DEV_DB_PATH`.

Что делает команда:

1. Создаёт консистентный snapshot через SQLite `VACUUM INTO`, включая данные из WAL.
2. Не меняет production-файл.
3. При `--replace` сохраняет предыдущую dev-базу в `*.backup.<timestamp>.sqlite`.
4. Не перезаписывает существующую dev-базу без явного `--replace`.
5. Требует явный флаг `--confirm-production-data`, потому что копируются реальные аккаунты, пароли и персональные данные.

На время clone dev-сервер нужно остановить. Полная копия должна храниться только на защищённой машине и не попадать в git/cloud backups без соответствующей политики доступа.

## Очистка базы

Обычная команда очищает только текущую non-production базу:

```bash
bun run db:clear
```

Для production требуется дополнительный `--confirm-production-data`; без него команда завершится с ошибкой.

## Логгер, метрики и healthcheck

Логгер - npm-пакет `hp_logger` (`^1.1.2`, zero-dependency). Один shared root
логгер в `src/lib/logger.utils.ts`, модули через `.module("AUTH" | "HTTP" | "WS" | "ERROR" | "DB" | "SEED" | "SYSTEM")`.
Настройка через env: `LOG_LEVEL` (root уровень), `LOG_MODULES` (`auth:debug,http:warn`),
`LOG_MODE` (`pretty` в dev, `json` в production по умолчанию), `LOG_COLOR=false` (без цветов),
`LOG_ENABLED=false` (выключить), `LOG_FILE_MODE` (`json`/`pretty` для файла),
`LOG_CONTEXT_FORMAT` (`json`/`kv`), `MAX_LOG_MESSAGE_LENGTH`.

- `GET /health` проверяет доступность SQLite: `{ ok, db: "up" | "down" }`, при недоступной БД возвращает 503.
- `GET /metrics` отдаёт метрики в формате Prometheus: HTTP-запросы по методу и статусу, гистограмма длительности, число WebSocket-клиентов, размер файла БД. Метрики реализованы в `hp_logger` (Counter/Gauge/Histogram/Registry) без внешних клиентских библиотек.
- Каждый запрос логируется плагином `requestLog.plugin.ts` (метод, путь, статус, длительность, correlation id); `/health` и `/metrics` в лог не пишутся. Correlation id раздаётся в `withRequestScope` и едет в каждом логе запроса автоматически.
- Ошибки 5xx дополнительно пишут объект ошибки со стеком через модуль `ERROR` в `error.plugin.ts`.
- `unhandledRejection` и `uncaughtException` логируются через `installErrorHandlers` при старте сервера, случайные `console.*` из зависимостей заворачиваются в логгер через `captureConsole`.
- Продакшен пишет JSON-строки в `logs/` с дневной ротацией; секреты режутся redaction до транспорта, управляющие символы чистятся (`stripControl`).
