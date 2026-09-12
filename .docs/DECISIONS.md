# Risovach Decisions

Журнал решений пользователя. Агент обязан проверить этот файл перед вопросом и записывать сюда решения после ответа, чтобы не переспрашивать.

## Формат записи

```markdown
### YYYY-MM-DD: Короткий заголовок

- Решение: ...
- Контекст: ...
- Последствие: ...
- Источник: ссылка на сессию/задачу
```

### 2026-09-12: Остаток сравнения с iluhaAnime (пункты 3, 5, 6)

- Решение: фронт получил `--deny-warnings` в `lint` (было 0 варнов после override для `scripts/**`, включается бесплатно). Форма ответа в §11 `AGENT_PROMPT.md` получила порог: полные buckets обязательны только для задач с кодом/поведением/доками, мелочь идёт свободным стилем чата.
- Решение: react-compiler возвращён: проверка `oxlint -D react/react-compiler` на 1.82.0 прошла без ошибки «неизвестное правило», полный react-пресет включён обратно (хак с `delete` удалён), линт фронта зелёный с нуля. Старое решение от 2026-08-20 о несовместимости с TS7 больше не действует для этого правила.
- Контекст: из прошлого сравнения остались отклонёнными `printWidth: 100`, kill-list, папочная структура/i18n/roadmap (причины прежние).
- Последствие: фронт `lint` чисто с полным пресетом и deny-warnings; бэк без изменений в этой задаче.
- Источник: запрос пользователя от 2026-09-12.


- Решение: backend вернул скрипт `typecheck` (был удалён), правила `typescript/consistent-return: warn`, `typescript/no-misused-promises: warn`, `complexity: warn`. Фронт получил `complexity: warn` и `no-console: warn` с разрешением `warn`/`error`, плюс override `scripts/**` (dev-скриптам консоль нужна как UI).
- Решение: найденные варны исправлены, а не задавлены: `beforeHandle` в `auth.plugin.ts` переписан на single-return через `correlationId` (так сошлись `consistent-return` и `no-useless-undefined`), `process.on` в `index.server.ts` обёрнут в `void shutdown()`.
- Контекст: сравнение `.docs` и конфигов с iluhaAnime без изменения кода. Не взято: `printWidth: 100` (переформат всего репо), kill-list на 130 правил (вес без выгоды), react-compiler (ждёт починки тулчейна под TS7), их папочная структура/i18n/roadmap (чужой стек).
- Последствие: backend `tsc` чисто, `lint` 0/0 (deny-warnings), тесты 41/41; фронт `lint` чисто, 0 варнов. С этого момента те же классы замечаний ловятся автоматически.
- Источник: запрос пользователя от 2026-09-12 (сравнение с iluhaAnime).


- Решение (B, дубли): `servicesPlugin` декорирует общие синглтоны вместо локальных копий; `db/config.db.ts` валидирует PRAGMA-env с фолбэками; `issueSession` схлопывает пару sign+set; `isRecord` один в `lib/guards.utils.ts`; версии протокола и реплея в `.d.ts` идут через `typeof`-импорт из runtime-констант; лимиты конфига наследуют дефолты из `replay.utils`. `normalizeUsername` убран по правилу ts-no-local-is-record (обёртка из одного выражения при двух вызовах): снова инлайн `toUpperCase`, trim осознанно не добавлен (смена поведения).
- Решение (B/C, авторизация): макрос `requireAuth` возвращён исправленным: `beforeHandle` возвращает ранний `Response.json` 401 с correlationId. Бросать исключение нельзя: elysia-плагин логгера считает статус сам и пишет в метрики 500 при корректном 401 в ответе (поймано тестом). Применён к `/lobbies/count`; `/me` оставлен с ручной проверкой (хендлеру нужен сам `user.sub`, макрос тип не сужает).
- Решение (C, контракт): `httpError(set, request, code, message?)` в `error.utils.ts` единый конструктор ручных ошибок (статус, шапка и тело с correlationId); переведены все ручные возвраты auth и avatar-роутов, строки сообщений сохранены (фронт матчится по `code`). ETag без `size` теперь `thumb` вместо `-undefined`; NaN sub явно даёт 401.
- Решение (D, структура): регистрация пишет через `UserService.createUser` (гонка check-then-insert ловится UNIQUE по `users.username` в 409); логин и `/me` читают проекциями без BLOB аватаров; `setRole` в сервисе, сид идёт через сервис с `UserRole`; скрипты `clear`/`clone` переехали из `src/db` в `scripts/`; кэш username переехал из конфига в `auth.utils`; лимитер чистит корзины лениво и честно отдаёт `retryAfterSeconds: 0` на разрешённых; гео-провайдеры гоняются параллельно (худшее время один таймаут); размер БД для метрик кэшируется 5 секунд; shutdown импортирует `rawDb` статически.
- Решение (D, откат): `path.utils` возвращён на `process.env`: файл импортируется `drizzle.config.ts`, который едет под node через `bunx`, где глобала `Bun` нет. Мой перевод на `Bun.env` ломал `bun run test` на шаге push. Правило: dual-runtime файлы только `process.env`.
- Решение (D, отклонено): роспуск `index.utils`, сплит `images`/`validateConfig`, вынос `servicesPlugin` из барреля, смена `t.String` на `t.Numeric`, общий `attempt` с фронтом (нужен shared-пакет) - цена выше пользы, записано чтобы не поднимать снова.
- Решение (E, тесты): `contracts.test.ts` распалён на `protocol`/`replay`/`geo`/`rateLimit` suites рядом с модулями; системные роуты вынесены из `requestLog.test.ts` в `routes/__test__/system.test.ts`, счётчики метрик меряются дельтой до/после; сид-тест идёт через drizzle и сервис с именованным `MISSING_USER_ID`; auth-тесты получили локальную base64 PNG-фикстуру вместо ассета фронта, `ensureUser`+`beforeEach`-чистку от зависимости порядка, точные shape/code/correlationId ассерты. Тест-cycle не тронут (домен заморожен).
- Решение (E, починка CI): `test:ci` никогда не работал: `--bail 1` с пробелом bun 1.4.1 считает фильтром файлов. Стало `--bail=1`.
- Контекст: найдены измерением, а не чтением доки: drizzle `.returning()` без терминатора возвращает билдер (не строки), терминатор `.get()` синхронный; `resolve` в макро Elysia не умеет ранний `Response` (не short-circuit, хендлер всё равно выполняется), `beforeHandle` умеет; `createUser`/`setRole` синхронные (bun-sqlite драйвер). Параллельная сессия в процессе удалила скрипт `typecheck` из `backend/package.json` (проверялся прямым `bunx tsc --noEmit`); её файлы не трогал.
- Последствие: `tsc` чисто, `lint` 0/0, `bun run test` 41/41, `bun run test:ci` (randomize, два разных сида) 41/41. Поведенческие дельты: тела ручных ошибок получили `correlationId`; ETag без size теперь `-thumb`; 409 на гонке регистров; гео быстрее в хвосте; BLOB не тянутся на login/me.
- Источник: запрос пользователя от 2026-09-12 (чистка бэкенда, все волны).


- Решение: удалён только мёртвый код без прод-вызывающих (проверено grep, LSP-сервер недоступен): макрос `requireAuth` и `token` из derive в `auth.plugin.ts`, `transaction.plugin.ts` целиком с проводкой, лишние `.use(databasePlugin)` в `lobby.route.ts`/`user.route.ts`, типы `RoomSettings`/`RoomRecord`/`ParticipantRecord`/`ActionRecord`/`RecoveryRecord`/`ReplayCommandRecord`/`ReplayCheckpointRecord`/`OperationStatus`/`LifecycleStage` из `contracts.d.ts`, битый `server.d.ts` целиком, `withFallback`, `omitPassword`, `getClientCount`.
- Решение (scope): доменные модули без вызывающих (`cycle.utils.ts`, `replay.utils.ts`, таблица `lobbies`) оставлены как будущее по ответу пользователя, вместе с их тестами. Константы версий в `.d.ts` оставлены до волны B (используются соседними типами, унификация отдельным шагом).
- Контекст: план чистки собран четырьмя скаутами (routes/plugins, lib, data/services, types/tests), волны B-E ждут очереди. Во время работы параллельная сессия переписала `index.server.ts`/`server.config.ts`; красный линт на её строке (`sort-keys`) починен одной перестановкой ключей с одобрения пользователя, чужую логику не трогал.
- Последствие: проверка волны A: backend typecheck чисто, lint 0/0, тесты 39/39. Поведение не менялось.
- Источник: запрос пользователя от 2026-09-12 (план чистки, волна A).


- Решение: весь бэкенд пишет через hp_logger 1.1.2. `createAppLogger()` теперь возвращает shared root-синглтон (один набор транспортов, один файл, один black box), модули через `.module()`. `picocolors` удалён из `backend/package.json` и `bun.lock`; цвета в сообщениях заменены структурным контекстом (`logger.success("api listening", { url })`), красит сам рендер pretty-вывода и уважает `LOG_COLOR=false`.
- Решение (настройки): `server.config.ts` задаёт `mode` json в production и pretty в dev с override через `LOG_MODE`, `colors: false` при `LOG_COLOR=false`, `stripControl: true` против log-инъекции через имена и IP. `LOG_MODULES` работает без кода (читает сам `createLogger`). Файловый транспорт прежний: `logs/` с дневной ротацией только в production.
- Решение (пробелы закрыты): `error.plugin.ts` пишет объект ошибки со стеком при статусах 5xx через модуль `ERROR` (сама request-строка уже была от elysia-плагина, стека не было). Скрипты `db/clear`, `db/clone`, `scripts/seed` пишут через модули `DB`/`SEED` и делают `await logger.close()` перед выходом, иначе буфер теряется. `index.server.ts` ставит `captureConsole(logger)`, поэтому остаточный `console.error` в `reportBackgroundError` (вызывающих в бэкенде нет, прямой импорт логгера создал бы цикл `attempt -> logger -> config -> path -> attempt`) тоже проходит redaction и файловые транспорты.
- Контекст: сайт-дока недоступна (`/docs` и `/docs/getting-started` отдают 404, в корне гайда нет, meta протухла на 0.10.1), истиной служили `backend/node_modules/hp_logger/llms.txt` 1.1.2, README пакета и dist-типы. Проверено в исходниках пакета: elysia-плагин пишет только request-строку без объекта ошибки, `createLogger` сам резолвит `LOG_MODULES`, `captureConsole` не рекурсивен.
- Последствие: `backend/README.md` (раздел логгера) и `backend/.env.example` (блок `LOG_*`) обновлены. Проверка: backend typecheck, lint, тесты.
- Источник: запрос пользователя от 2026-09-12.


- Решение: `.docs/DECISIONS.md` убран из индекса (`git rm --cached`), файл на диске оставлен. Остальной `.docs`, `AGENTS.md`, `.agents/`, `skills-lock.json` уже были untracked и игнорировались, их не трогали. В индексе трекался только `DECISIONS.md`, поэтому только он давал staged deletion.
- Контекст: в `.gitignore` есть `.docs/`, но закоммиченный файл `.gitignore` не покрывает: трекаемый файл остается видимым как `M`, а остальные файлы каталога уже показывались как `!!` в `git status --ignored`. Зафиксировано противоречие: `.docs/DEVELOPMENT.md` пишет, что документация трекается и не попадает в `.gitignore`, а фактический `.gitignore` игнорит `.docs/`, `AGENTS.md`, `.agents/`, `skills-lock.json`.
- Последствие: после коммита удаления (`git commit -- .docs/DECISIONS.md`) и пуша файл пропадет из новых клонов, но останется в старых коммитах истории. На чужих машинах `git pull` удалит рабочий файл, незакоммиченные локальные правки DECISIONS.md при этом не сохранятся автоматически. Журнал решений дальше живет только локально и как шина между сессиями на этой машине не работает.
- Источник: запрос пользователя от 2026-09-12.


### 2026-09-11: Frontend `bun test` не резолвил alias `@/`, починено в корневом tsconfig.json

- Решение: в `frontend/tsconfig.json` добавлены `baseUrl: "."` и `paths: { "@/*": ["./src/*"] }` (те же значения, что в `tsconfig.app.json`). Дублирование четырёх строк осознанное: решение-конфиг (`files: []` плюс `references`) читают `bun test` и `bun -e`, а `tsc -p tsconfig.app.json` читает свой конфиг; проектные ссылки TypeScript не наследуют `compilerOptions`, поэтому пути нужны в обоих файлах.
- Контекст: `frontend/src/config/api.config.ts` импортировал `../lib/attempt.utils` относительно только потому, что `bun test` падал на `@/lib/attempt.utils` (`Cannot find module` из `api.config.ts`), ломая auth- и lobby-тесты. Причина: bun ищет ближайший `tsconfig.json` от файла вверх и читает только его, директиву `references` он не разворачивает, а `paths` лежали в `tsconfig.app.json`. Vite резолвил alias своим `resolve.alias`, поэтому проблема проявлялась только в тестах.
- Последствие: `bun test` во frontend теперь видит alias, `api.config.ts` вернулся к `@/lib/attempt.utils`, внутренние импорты снова однородны. Проверка: frontend `bun test` 24/24, `tsc --noEmit -p tsconfig.app.json` чисто, `tsc -b` чисто, lint 0/0.
- Источник: запрос пользователя от 2026-09-11.

### 2026-09-11: В backend один хелпер результата, tryCatch.utils.ts заменён на attempt.utils.ts

- Решение: `backend/src/lib/tryCatch.utils.ts` удалён, единственный вызов (`tryCatchSync`) в `websocket.utils.ts` переведён на `attemptSync`. В backend остался один хелпер результата.
- Контекст: `tryCatch`/`tryCatchSync` возвращали `T | null` и теряли сам `Error`, а `attempt`/`attemptSync` возвращают пару `[value, error]` и потому полезнее. Дубль появился из параллельной сессии (файл был untracked WIP) и был вынесен на решение в предыдущей записи.
- Последствие: `broadcast` теперь логирует причину сбоя отправки клиенту (`reason: error.message`) вместо одного факта. Проверка: backend typecheck чисто, lint 0/0, 39/39 тестов.
- Источник: запрос пользователя от 2026-09-11.

### 2026-09-11: Логирование backend на hp_logger 1.1.2, attempt-хелперы, подписка на стор

- Решение (логгер): логгирование backend переведено на опубликованный API hp_logger 1.1.2 по `backend/node_modules/hp_logger/llms.txt`: `installGlobalErrorHandlers` заменён на `installErrorHandlers`, `scopeLogger.run(...)` на `logger.withContext(...)`. Причина: незакоммиченный код вызывал методы, которых в 1.1.2 нет, из-за чего backend был красный целиком (typecheck 2 ошибки, lint 5 ошибок, 22 из 39 тестов падали на `scopeLogger.run is not a function` в request-плагине, который оборачивает каждый запрос).
- Решение (отмена): запись от 2026-08-21 «logger.run в request-скоупе» больше не действует в части имени API: в 1.1.2 метода `run` нет, скоуп запроса создаётся через `withContext`. Наблюдаемое поведение сохранено: correlationId попадает в каждую запись запроса, включая async-продолжения.
- Решение (attempt): добавлены `frontend/src/lib/attempt.utils.ts` и `backend/src/lib/attempt.utils.ts` с `attempt(promise)`, `attemptSync(fn)`, `toError`, `withFallback`, `reportBackgroundError`. Голые `try/catch`, которые молча возвращали `null`, переведены на них: dots.utils (кэш сетки), draft.utils (parse и clear), document.utils (parse), api.config (разбор тела ответа), dropper.api (getImageData), geo.utils frontend (nominatim, ipapi, locale), App.tsx (refresh сессии), backend auth.utils (кэш username), backend geo.utils (провайдеры гео), backend path.utils (поиск package.json). Пустые catch, где был только комментарий, заменены на реальное действие: `reportBackgroundError` для storage и сетевых сбоев, `attemptSync` для проб файловой системы. Catch с re…
- Решение (стор): `frontend/src/routes/menu.route.tsx` вызывал `useUserStore()` без селектора, то есть подписывался на весь стор и перерисовывался на любое его изменение; заменено на `useUserStore((state) => state.user)`.
- Решение (em dash): длинные тире убраны из исходников (единственное вхождение было в `dots.utils.ts`). Файлы `DECISIONS.md` и `features/logger.md` не трогались, они защищены scope миграции и правки в них не входили.
- Контекст: ответы пользователя на аудит проекта от 2026-09-11 по блокеру B1 (backend красный) и по списку немедленных правок.
- Последствие: backend typecheck чисто, lint 0/0, 39/39 тестов; frontend typecheck чисто, lint 0/0, 24/24 теста. `frontend/src/config/api.config.ts` импортирует хелпер относительно (`../lib/attempt.utils`), потому что frontend `bun test` не разрешает alias `@/`: `paths` лежат в `tsconfig.app.json`, а bun читает корневой `tsconfig.json`, поэтому любое `@/` в файлах, которые тянут тесты, ломает `bun test`. Обнаружен дубль: `backend/src/lib/tryCatch.utils.ts` (untracked WIP, один вызов в `websocket.utils.ts`) даёт тот же смысл, что `attempt`/`attemptSync`; консолидация на один хелпер не делалась и вынесена на решение.
- Источник: аудит проекта и ответы пользователя, 2026-09-11.

### 2026-09-11: Скиллы hp_docs установлены в проект

- Решение: установлены все 11 скиллов пакета `HullPerse/hp_docs` в `.agents/skills/` командой `npx skills add HullPerse/hp_docs --yes`, включая `hp-docs` 1.5.0 с каталогом `templates/` и `hp-docs-update`. В корне репозитория появился `skills-lock.json` для будущего `npx skills update hp-docs`.
- Контекст: предыдущая миграция читала шаблоны из репозитория разово; для штатных следующих обновлений скиллы должны лежать на диске.
- Последствие: `.agents/skills/` (11 скиллов) и `skills-lock.json` теперь в рабочем дереве и не покрыты `.gitignore`, поэтому видны в `git status` как untracked. Решение коммитить их или добавить в `.gitignore` не принято. Шаблоны для `hp-docs-update` теперь берутся из `.agents/skills/hp-docs/templates/`.
- Источник: запрос пользователя от 2026-09-11.

- Решение: сгенерированные файлы `.docs/` переведены со старого шаблона ai-docs 1.0.0 на hp-docs 1.5.0 через скилл hp-docs-update. Добавлены `TESTING.md` (14 разделов, реальные команды `bun test`, `bun run test`, `test:ci`, coverage) и `SECURITY.md` (профиль `backend`, capability budget по реальным каналам), создан `hp-docs.meta.json` (language=ru, preset=neo-brutalism). Слияния: `AGENT_PROMPT.md` (новый раздел 6 "Минимализм: лестница ponytail", grill mode, gate спеки, ссылки на TESTING/SECURITY, обязательная проверка MCP), `DEVELOPMENT.md` (структура каталогов, типизация по языкам, benchmark-first, команды проекта, базовая безопасность, каталог деслопа), `DESIGN.md` (раздел 0 выбора пресета, оставлен только пресет neo-brutalism), `CHECKLIST.md`, `REVIEWER.m…
- Контекст: документация была сгенерирована старым шаблоном без `hp-docs.meta.json`; пользователь запросил миграцию с dry-run планом и подтверждением каждой развилки.
- Последствие: существующие записи `DECISIONS.md`, каталоги `features/`, `reviews/`, `answers/`, README, `AGENTS.md` и исходники не менялись; `.gitignore` не трогался, поэтому файлы `.docs/` остаются вне Git, как и раньше. Сохранены проектные правила: `types/*.d.ts`, русский язык, стек, команды, query-правила и пресет neo-brutalism. Обнаружен дрейф: в DEVELOPMENT.md указан `hp_logger ^0.1.1`, а в backend/package.json `^1.1.2`; правка не вносилась, вынесена на решение.
- Источник: сессия hp-docs-update, 2026-09-11.

- Решение: из обновлённого шаблона hp_docs перенесено правило параллельной работы - в `AGENT_PROMPT.md` добавлен раздел «Параллельные сессии» рядом со строгим gate для DECISIONS.md. Предположение: несколько агентов могут держать сессии одновременно; репозиторий - координационный слой: документация - общая память, текущий код - источник истины, `DECISIONS.md` - шина сообщений между сессиями. Четыре обязательные точки синка: на старте (проверка рабочего дерева на чужие незакоммиченные файлы), перед вопросом (перечитать хвост журнала), перед правкой (перечитать ранее загруженные файлы), на финише (сначала записи в журнал и список изменённых файлов до финального отчёта). Коллизия со scope - стоп, сверка с актуальным состоянием и вопрос пользователю вместо молчал…
- Контекст: пользователь попросил обновить документацию потребительских проектов из обновлённого шаблона hp_docs.
- Последствие: параллельная работа агентов в risovach считается нормой по умолчанию; координация идёт через сам репозиторий.
- Источник: задача переноса правила параллельных сессий, 2026-08-25.

### 2026-08-21: Фреймворк-бенчмарк на сайте — цена request logging +7-8µs

- Решение: по запросу пользователя добавлен в hp_logger_site бенчмарк «цена фичи»: один no-op handler в Elysia, Hono, Fastify, Node http и Bun.serve, baseline vs hp_logger request logging (bench-fw/ воркспейс, raw TCP с persistent keep-alive соединением). Сравнение с pino отклонено по рекомендации: middleware конкурента пришлось бы писать самим, а на уровне HTTP-запроса логгер - 1-5% времени, цифры мерили бы фреймворк.
- Результат: +7-8µs на запрос (19-21% от 35µs round-trip), в основном crypto.randomUUID() для correlationId; Fastify +2µs (его baseline медленнее). Страница /benchmark получила секцию с чартом и честными оговорками.
- Контекст: вопрос пользователя «а есть смысл бенчмаркать логгеры с фреймворками?»; выбран вариант «цена фичи на всех 5».
- Последствие: сайт запушен (367332e), проверки зелёные; воспроизводится через bench-fw (bun run build && ./bin/fw-bench.exe && bun scripts/merge.ts).
- Источник: запрос пользователя от 2026-08-21.

### 2026-08-21: hp_logger 0.3.1 — inline-уровни: disabled 125M -> 929M ops/s

- Решение: числовой порог уровня встроен прямо в методы уровня (по запросу «догнать noop pino в disabled»): выключенный уровень возвращается до вызова write(), map-lookup и работы с аргументами; порог остаётся динамическим (settings() обновляет levelThreshold). `write()` сохранил защитную проверку для event/measure/once/throttle.
- Результат (та же машина): disabled 125M -> 929M ops/s (7.4x), разрыв с noop pino (1.15B) ~19%. hp_logger 0.3.1 опубликован в npm, запушен (85ae146); сайт обновлён (34fd581); backend risovach на `^0.3.1`.
- Контекст: первая итерация (0.3.0) дала 118M -> 125M — ранний return был в write(); перенос проверки в сами методы дал скачок до 929M.
- Последствие: все проверки зелёные (backend typecheck, lint 0/0, 39 тестов; пакет 62 теста).
- Источник: запрос пользователя от 2026-08-21.

### 2026-08-21: hp_logger 0.3.0 — оптимизации; редизайн hp_logger_site

- Решение: hp_logger оптимизирован (HullPerse/hp_logger, 0.3.0, опубликован в npm): числовой порог уровня с ранним return до merge/redact, ISO-таймстамп кэшируется раз в секунду, красакт с fast-path (плоский контекст без чувствительных ключей не копируется), новая настройка `redactKeys: null` полностью отключает красакт (Error-сериализация остаётся).
- Решение: сайт hp_logger_site редизайнен под «убрать AI-slop»: все градиенты (violet-cyan hero, gradient-бары) и pill-кнопки убраны, один плоский amber-акцент, квадратные углы; страница бенчмарка и ноты обновлены под новые цифры + сценарии child/run/redaction on-off.
- Результат бенчмарка (та же машина): json 1.10M -> 2.54M ops/s, pretty 0.85M -> 1.44M, disabled 118M -> 125M, error 0.20M -> 0.23M (осознанно: cause chain); redaction-off 3.73M vs redaction-on 1.34M — видна цена защиты секретов. Подробности в .docs/benchmark-plan.md репозитория сайта.
- Контекст: запрос пользователя «убрать AI-slop с сайта» и «предложи решения для обгона в бенчмарках»; по вопросам выбраны вариант A редизайна и оптимизации disabled+json путей со сценариями.
- Последствие: backend risovach обновлён на `^0.3.0` (caret), все проверки зелёные (typecheck, lint 0/0, 39 тестов); сайт запушен (2089cbf..11657ee), пакет запушен (70664d7) и опубликован 0.3.0.
- Источник: запрос пользователя от 2026-08-21.

### 2026-08-21: Сайт-документация hp_logger (hp_logger_site)

- Решение: создать отдельный репозиторий и сайт-документацию hp_logger - D:/projects/webdev/hp_logger_site, github.com/HullPerse/hp_logger_site (public, запушен). Стек по выбору пользователя: React 19 + Vite 8 + Tailwind 4 (не Docusaurus), контент на английском, стиль bun.sh (тёмная тема, градиенты, тёмная/светлая тема). Структура src/ повторяет привычные проекты (pages/, components/, config/, lib/, types/).
- Решение: страницы - лендинг с терминальной анимацией, 11 doc-страниц, API Reference из TypeDoc JSON (typedoc по dist установленного пакета, JSON коммитится, ленивый чанк), плейграунд (симуляция форматирования пакета в браузере, честно помечена), страница бенчмарка и сравнения (pino, winston, consola, bunyan, log4js, signale - выбор пользователя).
- Решение: бенчмарк прогнан 2026-08-21 и встроен в сайт: вынесен в отдельный воркспейс bench/ с собственными зависимостями, каждая библиотека скомпилирована в отдельный .exe (изолированные запуски - общий процесс лагал), результаты смержены в src/data/benchmark.json (placeholder: false). Итог на машине автора: json - consola 3.85M / pino 2.43M / hp_logger 1.10M ops/s; disabled - pino 1.13B (noop-уровни) / hp_logger 118M; error - hp_logger самый медленный (0.20M) из-за сериализации Error с cause chain. Подробности в .docs/benchmark-plan.md (репозиторий сайта).
- Решение: факт из аудита пакета - у hp_logger 0.2.3 одна runtime-зависимость (picocolors), поэтому сайт не называет пакет zero-dependency; граф зависимостей и копирайт точны.
- Контекст: запрос пользователя создать сайт-документацию, задавать вопросы и предлагать; все вопросы заданы и получены ответы (фреймворк, конкуренты, источник цифр, язык, бонусы).
- Последствие: typecheck, lint 0/0, production build зелёные; все маршруты 200 через SPA fallback; деплой пользователь делает сам (статический dist/, нужен history fallback).
- Источник: ответы пользователя от 2026-08-21.

### 2026-08-21: logger.run в request-скоупе — correlationId автоматически в контексте запросов

- Решение: подключить `logger.run` (AsyncLocalStorage из hp_logger) на уровне всего запроса: `createApp()` оборачивает `app.fetch` в `withRequestScope(request, fn)`, поэтому любой лог внутри обработчика (включая async-продолжения) автоматически получает в контекст correlation id запроса. Причина обёртки fetch: Elysia-хуки (`onRequest`/`onAfterHandle`) не могут обернуть выполнение хендлера в ALS — контекст умирает, как только хук возвращается; `app.fetch` перезаписываемый (Elysia сам кладёт композицию в own property) и именно его `Bun.serve` использует при `listen()`.
- Решение: поле в контексте называется `correlationId` (не `requestId`): это устоявшееся имя в стеке (заголовок `x-correlation-id`, тело API-ошибок, ws-конверты, request-события плагина). Иначе в каждой записи было бы два id. Источник значения — `createCorrelationId` из `error.utils.ts` (заголовок или свежий UUID), тот же, что в error.plugin.
- Решение: скоуп-логгер создаётся отдельно (root без module) — `run` на модульном логгере вплёл бы `module: "HTTP"` в каждую запись запроса; скоуп-логгер никогда не пишет, файловые стримы открываются лениво, поэтому лишних ресурсов нет.
- Решение: ws-апгрейд идёт через обёрнутый fetch (проверено: 101 на `/ws`), метрики и health не затронуты.
- Контекст: запрос пользователя «подключить logger.run в requestLog-плагине, чтобы requestId автоматически попадал в контекст запросов»; сам хелпер `withRequestScope` живёт в `requestLog.plugin.ts`, обёртка fetch — в `createApp`.
- Последствие: backend typecheck, lint 0/0, 39 тестов (было 38, +1 на скоуп: correlationId из заголовка попадает в контекст записи); живая проверка — роуты/health/metrics/404/ws работают, request-события несут correlationId.
- Источник: запрос пользователя от 2026-08-21.

### 2026-08-21: Bun 1.4 фичи в hp_logger (0.2.2)

- Решение: изучить фичи Bun 1.4 (через локальные доки bun-types + release notes, context7 не отдал данные по API) и внедрить в hp_logger: `prettyWrap`/`prettyTruncate` настройки (ANSI-aware `wrapAnsi`/`sliceAnsi` на Bun 1.4+, fallback на обычный slice на Node), `memoryPressure` warn в `installGlobalErrorHandlers` (Bun 1.4+), детерминированные тесты timestamp через `setSystemTime`.
- Решение: `Bun.ArrayBufferSink` отклонён — замер показал медленнее массива+join (108ms vs 46ms). `CompressionStream` (сжатые архивы ротации) не берём сейчас — фича отложена из списка.
- Контекст: пользователь попросил найти Bun-фичи (обновился до 1.4 вчера) и обновить пакет; по вопросам выбрал все 4 опции + версию 0.2.2.
- Последствие: hp_logger 0.2.2 (60 тестов, +3 на pretty-настройки), опубликован в npm и запушен (02c835f..439a15d); backend на `^0.2.2`; все проверки зелёные (backend 38, frontend 24, пакет 60).
- Источник: ответы пользователя от 2026-08-21.

### 2026-08-21: Глубокий рефактор hp_logger 0.2.1

- Решение: аудит всего пакета по правилам AGENTS.md и рефактор без изменения публичного API: `BaseFileTransport` (FileTransport и DateBasedFileTransport делят буферизацию/flush/close, минус ~130 строк дублирования), `BaseMetric` с общими `headerLines`/`renderLabels`, общие хелперы интеграций `resolveCorrelationId`/`pathFromUrl`/`DEFAULT_SKIP_PATHS` во всех 5 фреймворках, удалён dead code (`LoggerConfig`, `RequestLogger`), `rateLimit` состояние упрощено до `Map<string, number>`, `installGlobalErrorHandlers` стал идемпотентным.
- Решение (баг): `Logger.run` теперь сливает унаследованный AsyncLocalStorage-контекст — вложенные `run()` больше не теряют внешний контекст.
- Решение: документацию (README) пользователь пишет сам, не трогаем; метрики/бенчмарки не изменились (~400k ops/s json, ~32M disabled lazy).
- Контекст: запрос пользователя «последний глубокий анализ пакета, чистка и рефактор по AGENTS.md».
- Последствие: hp_logger 0.2.1 (57 тестов, +1 на вложенный ALS), опубликован в npm и запушен (b4a46af..02c835f); backend на `^0.2.1`; все проверки зелёные (backend 38, frontend 24, пакет 57).
- Источник: запрос пользователя от 2026-08-21.

### 2026-08-21: hp_logger 0.2.0 — ленивые аргументы, trace/fatal, ALS, measure, once/throttle, addTransport

- Решение: реализовать из разбора фич «крутого логгера»: ленивые message/context (функции-аргументы — не вычисляются при выключенном уровне, в bench 33.7M ops/s против 381k у json write, ~90x), уровни trace/fatal, `logger.run(context, fn)` на AsyncLocalStorage (request-контекст, включая async-продолжения), `logger.measure(name, fn)`, `logger.once(key)`/`throttle(key, ms)` (анти-флуд), `Logger.addTransport/removeTransport/clearTransports` (точка расширения под OTLP/Sentry/Loki без зависимостей в ядре), adaptive default mode (TTY → pretty, pipe/file → json), error cause chain в сериализации.
- Решение (отложено): OTLP/Sentry/Loki адаптеры — до деплоя и инфраструктуры; sampling/dedup, пресеты dev/test/silent, source location, object pooling, ring buffer, priority queues — не делаем сейчас (нет hot-path нагрузки, сложность дороже выигрыша).
- Контекст: пользователь вставил большой список фич «BLAZINGLY FAST» логгера; по вопросам выбрал ленивые аргументы, measure+cause, once/throttle/rateLimit, trace/fatal+ALS, adaptive TTY; остальное не выбрал.
- Последствие: hp_logger 0.2.0 (56 тестов, 7 новых), опубликован в npm и запушен (2bc4d7e..b4a46af); backend на `^0.2.0`, список LOG_LEVELS в server.config.ts расширен trace/fatal; все проверки зелёные (backend 38, frontend 24, пакет 56).
- Источник: ответы пользователя от 2026-08-21 на разбор фич-списка.

### 2026-08-21: Страница /logs в risovach — отложена до админки

- Решение: страница `/logs` (лог-вьювер на сервере) отложена до появления админки и деплоя. Обсуждение закрыто без выбора варианта пользователем («скип»), рекомендованный вариант — отложить.
- Решение: не делать dev-only эндпоинт `/logs` и не включать DatabaseTransport ради страницы: самописный лог-вьювер разрастается (пагинация, фильтры, поиск, live, авторизация), в dev быстрее `tail -f`/grep, в prod это задача для Loki/Grafana, а деплоя и админки нет.
- Контекст: вопрос пользователя «насколько тупая идея /logs»; вердикт — не тупая, но преждевременная, это тот же возврат к отложенному audit log с другой стороны.
- Последствие: при появлении админки связка — DatabaseTransport (уже в hp_logger 0.1.6) пишет в таблицу `logs`, админка показывает с фильтрами; `database: false` в backend остаётся.
- Источник: обсуждение от 2026-08-21.

### 2026-08-21: Скорость и БД-интеграция hp_logger (0.1.6)

- Решение: бенчмарки + 2 микрооптимизации, без pino-style переписывания: hot-path логирования нет, гнаться за «blazing fast» бессмысленно. Встроенного bench API в Bun 1.4 нет, поэтому `bun run bench` — простой скрипт на `performance.now()` (json ~416k ops/s, pretty ~377k, async ~358k, sqlite ~229k).
- Решение: AsyncTransport использует новый опциональный `Transport.writeBatch(entries)` — один вызов на батч вместо промиса на каждую запись (fallback на `Promise.all`). Файловые транспорты держат открытый `createWriteStream(flags: 'a')` вместо `appendFile` на каждый flush.
- Решение: БД-интеграция через adapter-контракт: `DatabaseTransport` буферизует записи, фильтрует по `level` и отдаёт батчами в `DatabaseAdapter { write(entries), close?() }`. Готовый `createSqliteAdapter(db, { table? })` на `bun:sqlite` (zero-dep, автосоздание таблицы `logs`, вставки в транзакции, владелец `Database` — вызывающий). Другие БД — через свой adapter.
- Решение: в backend `database: false` — БД-транспорт выключен сразу при обновлении (SQLite не для логов; вернуться вместе с админкой/audit log).
- Контекст: пользователь выбрал «бенчмарки + 2 микрооптимизации» и «adapter-контракт + bun:sqlite»; в risovach транспорт отключён настройкой.
- Последствие: hp_logger 0.1.6 (49 тестов, 4 новых на database), опубликован в npm и запушен (31c0d01..2bc4d7e); backend на `^0.1.6` с `database: false`; все проверки зелёные (backend 38, frontend 24, пакет 49).
- Источник: ответы пользователя от 2026-08-21.

### 2026-08-21: Английский язык в hp_logger (0.1.5)

- Решение: комментарии, README и описания npm-пакета и GitHub-репозитория hp_logger пишутся на английском. Переведены README.md целиком и русский комментарий в `dateBasedFile.ts`; description репозитория на GitHub обновлён через `gh repo edit`.
- Решение: package.json description уже был на английском; версия поднята до 0.1.5, потому что npm обновляет README/метаданные только при публикации.
- Контекст: запрос пользователя: комментарии и описания npm-пакета и репозитория логгера должны быть на английском.
- Последствие: hp_logger@0.1.5 опубликован в npm (description и README в реестре английские), запушен в репозиторий (1dfca14..31c0d01); код не менялся, backend остаётся на `^0.1.4` (caret покрывает 0.1.5).
- Источник: решение пользователя от 2026-08-21.

### 2026-08-21: Единый файл логов на день в hp_logger (0.1.4); прод-конфиг логирования backend

- Решение: в hp_logger `DateBasedFileTransport` с `rotation: 'daily'` теперь держит один файл на день на `baseDir` для всех экземпляров логгера в процессе (модульный `Map` по ключу `baseDir::дата`). Раньше каждый экземпляр (SYSTEM, HTTP, ...) выбирал следующий свободный индекс и заводил свой файл, а повторные flush могли перескакивать на новый файл.
- Решение: запись в файлы переведена с `Bun.write(..., { append: true })` на `appendFile` из `node:fs/promises`: `Bun.write` с `append` на этой платформе перезаписывает файл, а не добавляет (проверено репро).
- Решение: прод-конфиг backend: `LOG_LEVEL` (по умолчанию `info`) читается hp_logger из env во всех 4 местах создания логгера; единая фабрика `createAppLogger(name)` в `backend/src/lib/logger.utils.ts` по конфигу `server.config.ts` включает файловый транспорт в production (`NODE_ENV=production`, `rotation: 'daily'`, `mode: 'json'`, путь `logs/`), в dev/test файл не пишется.
- Контекст: настройка прод-логирования через новые настройки hp_logger; при живом проде обнаружилось, что SYSTEM пишет в log_001, а HTTP в log_002.
- Последствие: hp_logger поднят до 0.1.4, опубликован в npm и запушен в репозиторий; backend на `^0.1.4`; в проде один файл на день со всеми модулями (проверено на живом сервере: SYSTEM + HTTP в log_001.log); 45 тестов пакета (1 новый), проверки backend/frontend зелёные.
- Источник: решение пользователя от 2026-08-21 (задача настройки LOG_LEVEL и file-логирования в прод-конфиге).

### 2026-08-20: Безопасная маршрутизация состояний QueryStateView

- Решение: `QueryStateView` обрабатывает loading, error, empty и success последовательными guard-ветками; render-prop вызывается только после проверки `state.data`.
- Решение: не использовать словарь состояний с non-null assertion, потому что он вызывает `children` преждевременно и может скрыть несовпадение ключей со значениями `status`.
- Контекст: ручное изменение `queryState.component.tsx` вызывало render-prop на loading/error и обращалось к ключам `isLoading`/`isError` при статусах `loading`/`error`.
- Последствие: loading/error/empty снова отображаются корректно, а type-aware lint запрещает `data!`.
- Источник: проверка пользовательского изменения от 2026-08-20.

### 2026-08-20: Имена файлов компонентов без дефисов

- Решение: basename файлов компонентов пишется в camelCase без дефисов; служебные суффиксы `.component.tsx`, `.canvas.tsx` и другие сохраняются.
- Решение: существующие `query-state.component.tsx`, `route-pending.component.tsx` и `current-stroke.canvas.tsx` переименованы в `queryState.component.tsx`, `routePending.component.tsx` и `currentStroke.canvas.tsx`; импорты обновлены.
- Контекст: имена React-компонентов уже были PascalCase, но имена файлов не соответствовали единой camelCase-схеме.
- Последствие: новые компонентные файлы не должны содержать дефисы в basename; переименование не меняет runtime-поведение.
- Источник: решение пользователя от 2026-08-20.

### 2026-08-20: Исправление frontend lint warnings

- Решение: исправить все 6 предупреждений frontend lint без отключения правил и без добавления исключений.
- Решение: toolbar Canvas использует Zustand actions и прямой export helper вместо чтения imperative `canvasApiRef` при построении модели; async export передаётся через синхронную оболочку с `void`.
- Решение: эффекты dots возвращают единый cleanup-контракт, включая безопасную отмену `ResizeObserver`, animation frame и interval.
- Контекст: после починки совместимости TypeScript 7 lint оставлял два предупреждения React refs и четыре предупреждения return/promise.
- Последствие: `frontend bun run lint` завершает проверку с 0 warnings и 0 errors; поведение рисования, undo/redo, очистки и PNG export сохранено.
- Источник: исправление по запросу пользователя от 2026-08-20.

### 2026-08-20: Визуальные варианты QueryStateView

- Решение: `QueryStateView` получает `variant: "compact" | "inline" | "window"`; default остаётся `inline`, чтобы не менять существующие места без явного выбора.
- Решение: `inline` использует `SmallLoader` и `InlineError`, `compact` использует уменьшенный `SmallLoader` и `SmallError`, а `window` использует `WindowLoader` и `WindowError` с retry-кнопкой при переданном `onRetry`.
- Решение: явные `loadingFallback`, `errorFallback` и `emptyFallback` имеют приоритет над fallback выбранного варианта.
- Решение: compact-вариант не добавляет вложенную retry-кнопку, потому что он предназначен для кнопок и бейджей; при необходимости вызывающий код передаёт собственный fallback.
- Контекст: один shared-компонент используется внутри маленьких элементов, обычных блоков и полноценных окон; один визуальный fallback не подходит всем контекстам.
- Последствие: профиль использует `variant="window"`, счётчик лобби - `variant="compact"`; TanStack Query API и нормализованное состояние не меняются.
- Источник: реализация по запросу пользователя от 2026-08-20.

### 2026-08-20: QueryStateView на экране профиля

- Решение: экран `ПРОФИЛЬ` получает данные через существующий `UserApi.currentUser()` и один TanStack Query с ключом `["auth", "me"]`.
- Решение: loading, error, retry и success отображаются через общий `QueryStateView`; результат query остаётся в переменной `data`.
- Контекст: профиль был заглушкой, а пользователь попросил подключить следующий экран с серверными данными к общей обработке query-состояний.
- Последствие: профиль показывает username, аватар, локацию и дату регистрации; `find` остаётся заглушкой до появления API списка лобби. Ответ `null` от `/auth/me` не отображается как валидный профиль.
- Источник: реализация по запросу пользователя от 2026-08-20.

### 2026-08-20: Совместимость frontend lint с TypeScript 7

- Решение: сохранить TypeScript 7 и type-aware lint через `oxlint`/`oxlint-tsgolint`, а несовместимые JavaScript-плагины `eslint-plugin-github`, `eslint-plugin-sonarjs` и `oxlint-plugin-react-doctor` убрать из frontend-конфигурации и зависимостей.
- Решение: удалить из Ultracite React preset только правило `react/react-compiler`, которого не знает установленная версия `oxlint`; остальные совместимые native presets и проектные overrides сохранить.
- Контекст: lint падал до проверки исходников из-за ограничений старых ESLint-плагинов на TypeScript 7 и неизвестного native rule.
- Последствие: `frontend bun run lint` работает с 0 ошибок и 6 предупреждениями существующего кода; type-aware проверки не отключены. Предупреждения не блокируют lint и требуют отдельного cleanup, если понадобится нулевой warning-бюджет.
- Источник: исправление по запросу пользователя от 2026-08-20.

### 2026-08-20: Общий тип и нормализатор query-состояния

- Решение: не оборачивать `useQuery` в новый hook и не скрывать API TanStack Query. Общий контракт реализован типами `QueryState`/`QueryStateInput` и чистым `resolveQueryState`.
- Решение: нормализованное состояние содержит `status`, `data`, `error`, `isLoading`, `isError` и `isFetching`. Связанные данные по-прежнему могут возвращаться одним query в составном DTO.
- Контекст: нужно единообразно обрабатывать состояния query без дублирования ручного loading/error state и без потери возможностей TanStack Query.
- Последствие: текущие query могут использовать helper, сохраняя обычное имя `data`; helper размещён в `lib/query.utils.ts`, общие типы - в `types/query.d.ts`.
- Источник: реализация по запросу пользователя от 2026-08-20.

### 2026-08-20: Общий QueryStateView для UI-состояний

- Решение: добавить `QueryStateView` в `frontend/src/components/shared/query-state.component.tsx` для отображения loading, error, empty и success состояний нормализованного query.
- Решение: компонент использует `SmallLoader` и `InlineError` по умолчанию, но принимает `loadingFallback`, `errorFallback`, `emptyFallback` и `onRetry` для контекстного UI.
- Контекст: нужно убрать повторение условного JSX вокруг query, не создавая новый hook и не скрывая TanStack Query.
- Последствие: меню использует общий компонент, но сохраняет компактный fallback для счётчика lobby; другие экраны могут использовать стандартный `InlineError` или свои fallback-компоненты.
- Источник: реализация по запросу пользователя от 2026-08-20.

### 2026-08-20: Строгие типы и границы каталогов

- Решение: явный `any` запрещён в написанном коде.
- Решение: `unknown` разрешён только внутри boundary-кода для JSON, `catch`, внешних библиотек и transport adapters. До выхода в доменную или UI-логику значение должно быть сужено через Zod или type guard до конкретного типа.
- Решение: общие типы и интерфейсы хранятся в `types/*.d.ts`, общие helpers и микрофункции - в `lib/*.utils.ts`, статические конфиги и hardcoded data - в `config/*.config.ts`, хуки - в `hooks/**/*.hook.ts`, API-клиенты и классы связи с сервером - в `api/**/*.api.ts`.
- Решение: локальный тип или helper можно оставить рядом с владельцем только после согласования конкретного пути с пользователем. Агент не выбирает такое исключение молча.
- Контекст: пользователь хочет исключить скрытые ошибки типизации и закрепить предсказуемую структуру исходников.
- Последствие: текущие boundary-места с `unknown` не считаются нарушением сами по себе; при изменении такого кода нужно проверять сужение типа. Полный запрет `unknown` не принят, потому что он ухудшает безопасность обработки внешних данных и ошибок.
- Источник: решение пользователя от 2026-08-20.

### 2026-08-20: Проверка пакетов и правила TanStack Query

- Решение: перед нетривиальной реализацией агент сначала проверяет `package.json`, lockfile, версии, документацию и фактическое использование подходящих установленных пакетов. Если готового решения нет, агент предлагает несколько современных вариантов с сравнением поддержки, лицензии, размера и производительности; новую зависимость нельзя добавлять молча.
- Решение: серверные данные фронтенд получает через TanStack Query и API-клиенты с явной обработкой `isLoading`/`isError`; `isFetching` используется для фонового обновления.
- Решение: в одном файле предпочтителен максимум один `useQuery`/`useSuspenseQuery`. Один query может возвращать составной типизированный DTO для связанных данных, например `data?.lobby.count` и `data?.profile.username`. Несколько независимых запросов допустимы при явном обосновании.
- Решение: результат query обычно оставляется в переменной `data` без переименования и используется по фактической форме ответа, например `data?.count`, `data?.value` или `data?.object1.value`. Универсальное поле `value` не добавляется только ради единообразия. Независимые ресурсы не объединяются только ради уменьшения числа query.
- Контекст: пользователь хочет использовать уже установленные современные решения, не дублировать TanStack Query ручным fetch-state и не терять смысловые имена данных.
- Последствие: агент будет предлагать готовые пакеты до самописной реализации, а query-код будет единообразно обрабатывать loading/error и сохранять контракт API.
- Источник: решение пользователя от 2026-08-20.

### 2026-08-20: Минимальная таблица lobbies и общий count

- Решение: добавить таблицу `lobbies` только с `id` (UUID в SQLite `TEXT`, primary key) и `title` (`TEXT NOT NULL`).
- Решение: добавить авторизованный `GET /lobbies/count`, который возвращает количество всех строк без фильтра по статусу.
- Решение: меню получает count через TanStack Query; статусы, создание lobby, владельцы, timestamps и дополнительные поля не входят в этот шаг.
- Контекст: пользователь хочет сначала создать минимальную основу lobby и заменить временное число в меню.
- Последствие: будущая фильтрация по статусам добавится отдельно, без изменения текущего API-контракта до принятия решения.
- Источник: решение пользователя от 2026-08-20.

### 2026-08-20: In-app loading для cold reload и navigation

- Решение: loading для cold reload, lazy route components и async route guards показывается внутри постоянной app shell через один pending-компонент на базе `WindowLoader`/`WindowComponent`.
- Решение: быстрые переходы не должны показывать loader; используется задержка появления pending state и минимальное время показа через настройки TanStack Router.
- Решение: `App` больше не должен быть единственной lazy-точкой до собственного `Suspense`; route pages остаются lazy.
- Решение: искусственная задержка в `MenuPage` удаляется. Фоновые refresh после visibilitychange не перекрывают уже открытый экран.
- Контекст: полноэкранный `BigLoader`, lazy App и локальный timeout создавали мигания и разные loading-состояния.
- Последствие: навигация сохраняет app shell, а долгий переход показывает единое окно `ЗАГРУЗКА`; варианты overlay поверх старого экрана и отдельного splash не вводятся.
- Источник: решение пользователя от 2026-08-20.

### 2026-08-20: Toolbar adapter для Canvas features

- Решение: связь capability с кнопками реализуется отдельным toolbar adapter, а не refs или JSX внутри `features`; adapter реализован для текущих registration/editor controls.
- Решение: adapter получает тот же `CanvasFeatures` и формирует UI props: `rendered`, `disabled`, `aria-pressed`, label и shortcut. Canvas остаётся движком и не знает о DOM-кнопках.
- Контекст: registration/editor toolbar сейчас вручную дублируют список инструментов и их shortcuts.
- Последствие: presets остаются переиспользуемыми и независимыми от React-монтажа; focus и реальные refs остаются ответственностью toolbar.
- Источник: реализация по запросу пользователя от 2026-08-20.

### 2026-08-20: Единый features API для Canvas

- Решение: рефактор Canvas реализован через единый prop `features` со сгруппированными capabilities: `tools`, `camera`, `history`, `persistence`, `export`, `keyboard` и `cursor`. Значения capability: `false`, `true` или объект настроек; пропущенные поля сохраняют текущие defaults.
- Решение: registration/editor используют presets, toolbar остается снаружи Canvas и следует тому же preset.
- Решение: в этой итерации поддерживается один активный Canvas. Глобальные Zustand stores сохраняются; изоляция нескольких Canvas откладывается в отдельный рефактор.
- Контекст: нужно включать и настраивать возможности Canvas в разных сценариях без plugin-системы и без смешивания движка с toolbar.
- Последствие: guards обязательны во всех input/render/persistence/API путях; public plugin API не вводится.
- Источник: решение пользователя от 2026-08-20.

### 2026-08-19: Canvas API, replay storage и advanced scope

- Решение: canonical final replay хранится только на сервере; отдельный editable document format и headless renderer не нужны.
- Решение: нужен внутренний imperative API для game round state, phase lock, submit, spectator/replay control, PNG/replay export и diagnostics. Public plugin API, smart shapes, constraints, auto-layout, scripting, components API и AI исключены или отложены.
- Контекст: игровой canvas должен иметь минимальный контролируемый API для lobby/backend, а не превращаться в extensible design platform.
- Последствие: сервер остаётся источником canonical replay; расширяемость пересматривается только отдельным решением.
- Источник: ответы пользователя от 2026-08-19.

### 2026-08-19: Canvas final boundaries и budgets

- Решение: canonical data - server replay; отдельный editable document format не нужен. Grid, ruler, templates, components/instances, smart shapes, CAD, AI и public plugins исключены.
- Решение: cursors игроков ограничены colored position + name; дополнительные collaboration controls отложены.
- Решение: product quotas для points/objects/replay не фиксируются как постоянная цель, но security/abuse limits, rate limiting и malformed payload protection обязательны.
- Решение: target - 60 FPS, pointer latency under 16 ms и final PNG export under 1 second на целевом desktop.
- Контекст: продукт остаётся игровой drawing-поверхностью, а не универсальным editor/CAD.
- Последствие: planning-решения сначала ведутся в `.docs/features/canvas.md`; код не меняется только из-за roadmap-записи.
- Источник: ответы пользователя от 2026-08-19.

### 2026-08-19: Disposition и documentation destination новых фич

- Решение: до реализации каждой новой фичи агент отдельно спрашивает implementation disposition: реализовать сейчас, отложить с условием возврата или отклонить.
- Решение: отдельно выбирается documentation destination: существующий релевантный feature-файл, новый feature-файл или только `.docs/DECISIONS.md`.
- Контекст: пользователь хочет контролировать момент реализации и место хранения планов.
- Последствие: implementation и documentation destination независимы; существенные решения зеркалируются в общем журнале.
- Источник: решение пользователя от 2026-08-19.

### 2026-08-19: Прямой критический режим

- Решение: агент не поддакивает плохим идеям. Если предложение ненужное, вредное, преждевременное, рискованное или чрезмерно сложное, сначала даётся прямой verdict с причиной, последствиями, альтернативой и условием пересмотра.
- Решение: допустим резкий разговорный язык про идею, но не унижение пользователя как человека.
- Контекст: нужен честный технический feedback вместо формального согласия.
- Последствие: хорошие идеи также признаются хорошими; критика не выдумывается ради тона.
- Источник: решение пользователя от 2026-08-19.

### 2026-08-19: Обязательный pushback и простой русский

- Решение: при плохом предложении агент обязан возразить и выбрать лучший путь, а не прятать verdict за равноправным списком.
- Решение: вопросы и варианты пишутся простым русским языком, короткими labels и конкретными descriptions без маркетингового мусора и случайного английского.
- Последствие: `(recommended)` используется только для реально обоснованной рекомендации и не заменяет отдельное решение о реализации.
- Источник: решение пользователя от 2026-08-19.

### 2026-08-19: Обязательная запись существенных изменений

- Решение: `.docs/DECISIONS.md` читается до аудита и реализации. Каждое существенное продуктовое, UX, архитектурное, техническое, безопасностное, персистентное решение и исправление поведения записывается до финального отчёта.
- Контекст: журнал является единым источником принятых ограничений и предотвращает молчаливую смену направления.
- Последствие: задача не считается завершённой без записи либо явного указания, что существенных решений не было.
- Источник: решение пользователя от 2026-08-19.

### 2026-08-19: Контрастный масштабируемый кастомный курсор

- Решение: цвет обводки кастомного курсора выбирается по максимальному контрасту с композитным пикселем под указателем, включая прозрачный слой на белом фоне.
- Решение: ширина обводки равна 0.75 экранного пикселя и компенсирует zoom.
- Контекст: чёрный курсор и sampling только alpha плохо работали на разных фонах, а ширина в world coordinates визуально менялась при zoom.
- Последствие: добавлен `getContrastingPixelColor` в `frontend/src/lib/canvas.utils.ts`, sampling используется всеми canvas tools, добавлены тесты.
- Источник: исправление пользовательского бага от 2026-08-19.

### 2026-08-19: Отказ от perfect-freehand

- Решение: убрать `perfect-freehand` и его пайплайн. Штрих рендерится как сырой полилайн через `Konva.Line` с round cap/join, без замкнутой заливки и variable width.
- Решение: PNG export использует тот же stroke pipeline; `simplifyPoints` оставлен для уменьшения данных.
- Контекст: smoothing, streamline, thinning и simulatePressure меняли путь пользователя, хотя требовался точный raw drawing.
- Последствие: pressure/style поля удалены из canvas types, zod-схем, stores и API; старые drafts продолжают парситься с удалением неизвестных полей.
- Источник: решение пользователя от 2026-08-19.

### 2026-08-19: Админ-сид по id

- Решение: `bun run db:seed` не создаёт отдельного пользователя и не использует `ADMIN_USERNAME`/`ADMIN_PASSWORD`. Команда интерактивно принимает ID существующего пользователя и меняет его роль на `admin`.
- Решение: для production сохраняется явный флаг `--confirm-production-data`.
- Контекст: админские права должны выдаваться существующему аккаунту.
- Последствие: логика вынесена в `promoteUserById`, env-переменные отдельного админ-аккаунта удалены.
- Источник: решение пользователя от 2026-08-19.

### 2026-08-19: Отмена motion-пайплайна background dots

- Решение: вернуть фоновые dots к обычным кругам и линейному fade линий; не возвращать velocity/heat/heatmap motion без явного запроса.
- Контекст: пользователю не понравился визуал с velocity и heat-пайплайном.
- Последствие: моушен-изменения в dots-файлах откатить, несвязанные оптимизации сохранить.
- Источник: решение пользователя от 2026-08-19.

### 2026-08-19: Полный отказ от миграций

- Решение: убрать migration runner, migration-файлы и таблицу `__drizzle_migrations`. `backend/src/db/schema.db.ts` - единственный источник истины.
- Решение: схема применяется вручную через `bun run db:migrate`; тесты применяют её к test-БД через `drizzle-kit push --force`.
- Контекст: migration table конфликтовала с Drizzle schema, а dev/test БД создавались на лету.
- Последствие: новые таблицы и колонки требуют ручного запуска migrate для dev/prod.
- Источник: решение пользователя от 2026-08-19.

### 2026-08-19: Роли пользователей

- Решение: в `users` есть роль `user` по умолчанию, `admin` и зарезервированная `subscriber`. Роль возвращается в public user data.
- Последствие: регистрация создаёт обычного `user`, админ назначается отдельным seed по ID.
- Источник: решение пользователя от 2026-08-19.

### 2026-08-19: Правила для агентов

- Решение: внедрить полный агент-контракт в `.docs/` с аудитом до кода, обязательными вопросами, checklist, reviewer prompt и журналом решений; корневой `AGENTS.md` остаётся указателем.
- Контекст: правила адаптированы из внутренней документации CodeEditor.
- Последствие: агент обязан сначала проводить аудит, фиксировать решения и не начинать дорогие изменения без согласования.
- Источник: решение пользователя от 2026-08-19.

### 2026-08-19: Отказ от twir-паттернов

- Решение: не внедрять слой repositories interface+model+impl, overlay libraries, sandbox execution JS и NATS bus.
- Контекст: для текущего монолита это лишний overhead без подтверждённой пользы.
- Последствие: пересмотр возможен при существенном росте доменов или выделении отдельных сервисов.
- Источник: решение пользователя от 2026-08-19.

### 2026-08-19: Структура feature-документации

- Решение: основные feature-файлы - `profile.md`, `lobby.md`, `settings.md`, `canvas.md` и `other.md`.
- Решение: canvas владеет drawing/camera/render/export/performance; lobby - rooms/phases/live sync/spectator/replay/presence; profile - profile/statistics; settings - lobby/round settings; other - остальные направления.
- Решение: отдельный `game.md` не создавать; игровые раунды относятся к lobby. Старый `osu.md` перенесён в `other.md`.
- Контекст: один владелец документации для каждого направления снижает риск расхождения.
- Источник: организационное решение пользователя и агента от 2026-08-19.

### 2026-08-19: Простой формат feature-файлов

- Решение: feature-файлы писать короткими обычными абзацами и списками. Для каждой идеи указывать идею, комментарий, плюсы, минусы и альтернативы, если идея спорная.
- Решение: не использовать декоративные таблицы и глубокую вложенность без пользы; кодовые примеры добавлять только когда они объясняют реальное изменение.
- Последствие: старые разделы не переписываются целиком только ради стиля, а упрощаются при следующем содержательном изменении.
- Источник: решение пользователя от 2026-08-19.

### 2026-08-21: Disposition по анализам .docs/answers

- Решение: по всем пунктам пяти файлов answers принят disposition через вопросы пользователю; автоматически отложено или отклонено всё, кроме `test:ci`, реализуемого сейчас. Вопросы задавались только по пунктам с рекомендованной реализацией.
- Решение (отложено): прод-сборка с feature flags и minify, бинарник `bun build --compile` - пользователь настроит сам в будущем; better-auth и oRPC - до роста API и появления соцвхода/2FA; Hono, Cloudflare D1, Alchemy, R2/KV/DO, TanStack Start - только вместе с Cloudflare-эпиком; Anubis - до реальной проблемы с ботами и юридической проверки AGPL-3.0; классификация с evidence, Inspector, виды списков, модерация, кэш рендеров, audit log, soft delete, экспорт, headless core, линейный режим реплея, Registry/UI Gallery, тема-редактор, step-up auth, локализация, index/viz records - до появления лобби/реплеев/админки; полный переезд на TypeScript 7 - до GA (API ready + LSP ready).
- Решение (отклонено): Bun.serve, bun:sql, колонка safety_classification, JSON-базы знаний, импортер внешних баз, CLI, background scan, Action Engine, Settings JSON-редактор, Relationships, Template Center, Turborepo, lefthook.
- Контекст: часть пунктов answers уже закрыта кодом (bun:sqlite в db/index.db.ts, TS7-гибрид, replay schema в replay.utils.ts) или решениями от 19-20.08 (границы canvas, отказ от twir-паттернов).
- Последствие: решение о деплое VPS/Cloudflare остаётся открытым и вернётся вместе с CF-эпиком; страница вопросов по answers закрыта.
- Источник: сессия от 2026-08-21.

### 2026-08-21: Скрипт test:ci с coverage и retry

- Решение: в backend скрипт `test:ci` = `NODE_ENV=test bunx drizzle-kit push --force && NODE_ENV=test bun test --coverage --retry 2 --randomize --bail 1`; `--randomize` оставлен по повторному решению пользователя от 2026-08-21 (перепроверка порядка тестов).
- Контекст: улучшенный test runner Bun 1.4.0 (--coverage, --retry, --randomize); первоначально пользователь отклонял randomize, чтобы не маскировать порядковые зависимости, но позже оставил его.
- Последствие: CI-прогон выдаёт текстовый coverage-отчёт, ретраит флаки и перемешивает порядок тестов; обычный `bun test` и его поведение не меняются.
- Источник: решение пользователя от 2026-08-21.

### 2026-08-21: Индикатор соединения; отклонение reduced-motion

- Решение: добавить индикатор состояния WebSocket-соединения в шапку меню. `WsClient` отслеживает статус `idle/connecting/online/offline` через `subscribeStatus/getStatus`; хук `useConnectionStatus` использует `useSyncExternalStore`; компонент `ConnectionIndicator` рендерится в `WindowComponent` (проп `headerRight`) только для залогиненного пользователя.
- Решение: reduced-motion (`prefers-reduced-motion`/`MotionConfig`) отложен: анимации проекта короткие (100ms), а для канвас-игры польза низкая; вернуться при добавлении длинных анимаций.
- Контекст: разбор answers; WebSocket-клиент (`websocket.api.ts`) уже существовал, но его состояние нигде не отображалось.
- Последствие: при логауте каналы очищаются, соединение закрывается, индикатор скрывается; при разрыве соединения индикатор показывает ОФЛАЙН и переподключение идёт автоматически.
- Источник: решение пользователя от 2026-08-21.

### 2026-08-21: Новый модуль логгера (backend/src/lib/logger)

- Решение: создать полноценный модуль логгера в `backend/src/lib/logger/` с разделением на `types.ts`, `utils.ts`, `logger.ts`, `transports/` (console, file, date-based-file, async, multi, factory) и `index.ts`.
- Решение: мигрировать все существующие использование старого `Logger` из `logger.utils.ts` на новый `createLogger` API: `src/index.server.ts` (SYSTEM), `src/plugins/error.plugin.ts` (SYSTEM), `src/routes/auth.route.ts` (AUTH с child loggers).
- Решение: удалить legacy `types/logger.d.ts` (неполный, без `success` level) и старый `src/lib/logger.utils.ts`.
- Решение: добавить `tryCatch` / `tryCatchSync` utility в `lib/try-catch.utils.ts` для замены пустых catch-блоков.
- Решение: применить `tryCatchSync` в `src/lib/websocket.utils.ts` (broadcast) с логированием ошибок отправки.
- Решение: рефакторить transport factory из switch на `Record` map для расширяемости.
- Решение: добавить `DateBasedFileTransport` с структурой `logs/{yyyy-mm-dd}/log_{NNN}.log` для продакшн-логирования.
- Решение: добавить тесты в `src/lib/logger/logger.test.ts` (12 тестов: уровни, child loggers, redaction, async transport, JSON mode).
- Контекст: старый logger был минимальным классом в `lib/logger.utils.ts`, не поддерживал structured JSON, child loggers, async writes, file rotation. Пользователь запросил полноценный модуль с этими фичами.
- Последствие: все проверки проходят (`typecheck`, `lint`, `test` - 44 теста). Структура соответствует границам каталогов (types в модуле, utils в модуле).
- Источник: сессия от 2026-08-21, вопросы пользователю по каждому пункту.

### 2026-08-21: Record map вместо switch для factory-паттернов

- Решение: использовать `Record<Key, Factory>` вместо `switch`/`case` в factory-функциях, когда это не ухудшает производительность, но делает код чище, расширяемее и тестируемее.
- Контекст: при рефакторинге `createTransport` в logger module switch заменили на map. Это убрало дублирование, упростило добавление новых транспортов и устранило линтер-проблемы с `sort-keys`.
- Последствие: новые factory-функции пишутся через `Record`; старые switch можно рефакторить при следующем изменении. Исключение — горячие пути с критичной производительностью (проверять бенчмарками).
- Источник: решение пользователя от 2026-08-21.

### 2026-08-21: Улучшение логгера и отдельный npm-пакет

- Решение: остаться на самописном логгере, не переходить на Pino/LogTape/tslog (нет hot-path логгирования, свой код покрыт тестами и контролируется).
- Решение: добавить в логгер request logging middleware для Elysia, сериализацию `Error` в context, перехват `unhandledRejection`/`uncaughtException`, фикс двойного обрезания сообщений, уровень из env (`LOG_LEVEL`).
- Решение: вынести логгер в `packages/logger` как npm-пакет монорепо (`@risovach/logger`), импортировать локально через workspace, публиковать позже. Отдельный git-репозиторий отклонён: два репозитория и CI без пользы.
- Решение: добавить метрики через `prom-client` на `/metrics` (HTTP-счётчики, гистограмма длительности, WS-подключения, размер БД) и расширить `/health` проверкой доступности SQLite. Без Cloudflare: метрики - это просто HTTP-endpoint.
- Решение: audit log снова отложен: до появления лобби/реплеев/админки аудитить нечего, существующее решение от 21.08.2026 остаётся в силе.
- Контекст: разбор репозиториев по логированию и серверной части (tslog, Pino, LogTape, Roarr, Consola, tracing, fern, slog; twir-main как референс по request logging и observability). Rust-логгеры неприменимы: стек Bun + TypeScript.
- Последствие: план и disposition зафиксированы в новом `.docs/features/logger.md`; решения по реализации - в этой записи.
- Источник: ответы пользователя от 2026-08-21.

### 2026-08-21: Настройка formatContext в hp_logger (0.1.3)

- Решение: добавить в hp_logger настройку `formatContext: 'json' | 'kv'` (по умолчанию `json`): как рендерить context в pretty-выводе. `kv` выводит пары `key="value"` вместо JSON-объекта; применяется и в консоли, и в файловом `mode: 'pretty'` (единый хелпер `formatContext` в utils).
- Контекст: это второй вариант из запроса «цветовой префикс уровня или формат контекста»; `showLevel` уже был добавлен в 0.1.2.
- Последствие: hp_logger поднят до 0.1.3, опубликован в npm и запушен в репозиторий; backend обновлён на `^0.1.3`; 44 теста пакета (2 новых), проверки backend/frontend зелёные.
- Источник: решение пользователя от 2026-08-21.

### 2026-08-21: Настройка showLevel в hp_logger (0.1.2)

- Решение: добавить в hp_logger настройку `showLevel` (по умолчанию `false`): цветной префикс уровня `[INFO]`/`[ERROR]` в pretty-выводе перед автором, цвет по цвету уровня.
- Решение: формат контекста в pretty-выводе (`json`/`kv`) не добавлять сейчас - отдельная настройка при необходимости.
- Контекст: в pretty-выводе уровень был виден только по цвету, текстом его не было.
- Последствие: hp_logger поднят до 0.1.2, опубликован в npm и запушен в репозиторий; backend обновлён на `^0.1.2`; 42 теста пакета (2 новых), проверки backend зелёные.
- Источник: решение пользователя от 2026-08-21.

### 2026-08-21: hp_logger 0.2.3 — кастомный форматтер pretty-вывода (.format)

- Решение: добавить в hp_logger глобальную настройку `format` — функцию `(entry) => string`, которая полностью заменяет pretty-рендер записи и для консоли, и для файловых транспортов (`file.mode: 'pretty'`). Дефолты не менялись: консоль по-прежнему учитывает `showTimestamp`/`showLevel`/`showAuthor`, файл всегда пишет `[time] [author] [LEVEL]` (в файле нет цветов, уровень — единственный способ отличить severity при чтении; это зафиксировано как есть и задокументировано в README).
- Решение: если `format` задан — он применяется ко всем записям в pretty-режиме (и консоль, и файл), `show*` и `prettyWrap`/`prettyTruncate` игнорируются для отформатированной строки; в json-режиме `format` не применяется.
- Решение: опубликовать 0.2.3 в npm (коммит 268cb47, пуш в github.com/HullPerse/hp_logger) и поднять backend на `^0.2.3`.
- Контекст: закрытие Risk из аудита 0.2.1 — несогласованность show*-настроек между консолью и файлом; пользователь выбрал фиксировать дефолт как есть и дать глобальный форматтер вместо починки «в лоб».
- Последствие: пакет 62 теста, lint 0/0, typecheck, build OK; backend typecheck/lint/38 тестов зелёные; публичный API не сломан (format опционален).
- Источник: ответ пользователя от 2026-08-21 (опция «Зафиксировать как есть + глобальный форматтер»).

### 2026-08-21: Чистый корень risovach, backend на npm-пакете, настройки логгера 0.1.1

- Решение: удалить из risovach корневой workspace (`package.json` с workspaces, `bun.lock`, `node_modules`) и `packages/`: корень содержит только `.docs/`, `.zed/`, `AGENTS.md`, `backend/`, `frontend/` и служебные git-файлы.
- Решение: backend зависит от `hp_logger` как от обычной npm-зависимости (`^0.1.1`) вместо `workspace:*`; отдельные установки в `backend/` и `frontend/`.
- Решение: в hp_logger добавлены настройки `enabled` (мастер-выключатель), `redactDepth` (глубина маскировки контекста, было захардкожено 2), `file.mode` (`json`/`pretty`); файловые транспорты теперь дожидаются записи в `close()` (flush стал async). Версия пакета поднята до 0.1.1 и опубликована в npm, изменения запушены в hp_logger.
- Контекст: пользователь хочет чистый корень репозитория и чтобы импорт пакета был просто `hp_logger` (так и есть).
- Последствие: backend и frontend проверяются отдельно (`cd backend && bun install`, `cd frontend && bun install`); все проверки зелёные (backend 38 тестов, frontend 24, пакет 40).
- Источник: решение пользователя от 2026-08-21.

### 2026-08-21: Свои метрики вместо prom-client; имя пакета hp_logger; отдельный репозиторий

- Решение: реализовать собственные `Counter`/`Gauge`/`Histogram`/`Registry` в пакете `hp_logger` (zero-dependency) и удалить `prom-client` из backend вместе с транзитивными `@opentelemetry/api` и `tdigest`. Формат `/metrics` и имена метрик не изменились; метрики покрыты тестами в пакете.
- Решение: пакет публикуется в npm под именем `hp_logger` (не `@risovach/logger`): так указано в `package.json`, README и у автора HullPerse; запись в этом журнале об `@risovach/logger` устарела.
- Решение: логгер хранится в отдельном git-репозитории `github.com/HullPerse/hp_logger` (создан), код пакета живёт в `packages/logger` монорепо и пушится туда; ворох незакоммиченных изменений в risovach не коммитится.
- Решение: `test:ci` остаётся с `--randomize --bail 1`; запись журнала о "без randomize" устарела и обновлена.
- Решение: Anubis остаётся отложенным: реальной проблемы с ботами нет, AGPL-3.0 без юр. проверки, продакшн-деплоя (VPS/CF) ещё нет. Условия возврата прежние.
- Контекст: перепроверка правил AGENTS.md по репозиторию (все проверки зелёные, исправлены 3 lint-ошибки фронтенда и удалены мусорные test3.txt/test4.txt) и запрос пользователя по метрикам и публикации.
- Последствие: backend и пакет проходят typecheck, lint, тесты; `/metrics` проверен на живом сервере; `prom-client` удалён из backend и lock-файлов.
- Источник: ответы пользователя от 2026-08-21.

### 2026-08-21: Реализация логгера, request logging, метрик, workspace

- Решение: логгер вынесен из `backend/src/lib/logger/` в `packages/logger` (`@risovach/logger`), подключён через корневой workspace (`bun install` из корня). Уровень читается из `LOG_LEVEL`; `Error` в context сериализуется в `{ name, message, stack }`; двойное обрезание сообщений убрано (одно обрезание по `maxMessageLength`); добавлен `installGlobalErrorHandlers` для `unhandledRejection`/`uncaughtException`.
- Решение: логирование HTTP-запросов перенесено из `error.plugin.ts` (убрано) в новый `requestLog.plugin.ts`: метод, путь, статус, длительность, correlation id; уровень по статусу (2xx/3xx info, 4xx warn, 5xx error); `/health` и `/metrics` фильтруются. Плагин использует `onBeforeHandle`/`onAfterHandle`/`onError` с `{ as: "global" }`; статус ошибок вычисляется через `getErrorStatus`, потому что `onError` errorPlugin возвращает тело и обрывает цепочку после себя.
- Решение: добавлены метрики через `prom-client` на `GET /metrics`: `risovach_http_requests_total`, `risovach_http_request_duration_ms`, `risovach_ws_clients`, `risovach_db_size_bytes`. `/health` теперь проверяет SQLite (`SELECT 1`) и возвращает 503 при недоступной БД.
- Контекст: реализация плана из `.docs/features/logger.md`; audit log остаётся отложенным.
- Последствие: backend и пакет проходят typecheck, lint, 54 теста (37 backend + 17 logger); метрики и healthcheck проверены на живом сервере.
- Источник: реализация по плану от 2026-08-21.

### 2026-09-12: Откат на 6d5e8ae и восстановление доков и линт-стека

- Решение: по команде пользователя дерево жестко откачено на `6d5e8ae ADDED: initial pages` без бекапа (7 коммитов и незакоммиченные правки потеряны); из `2dff2eb` возвращены `backend/package.json`, `backend/bun.lock`, `backend/oxlint.config.ts`, `frontend/package.json`, `frontend/bun.lock`, `frontend/oxlint.config.ts` и `.docs/DECISIONS.md`.
- Решение: `.docs/` восстановлен в объеме `каркас из шаблона + наш контент`: `AGENT_PROMPT.md` (строки 1-300 и 420 дословно из истории сессии, параграфы 10-11 пересобраны), `DEVELOPMENT.md` и `backend/README.md` дословно из сессии, `AGENTS.md` из стартового контекста, `CHECKLIST.md`/`TESTING.md`/`REVIEWER.md`/`agents-audit.prompt.md` - структура hp-docs 1.5.0 из iluhaAnime с risovach-правками, `DESIGN.md`/`SECURITY.md` - короткие по известным фактам, хвост `DECISIONS.md` (09-11/09-12) - из истории сессии.
- Контекст: `.docs/`, `.agents/`, `AGENTS.md`, `skills-lock.json` никогда не коммитились и были снесены `git clean`; в гите из доков лежал только `.docs/DECISIONS.md`. Невосстановимо: `.docs/features/*`, `.agents/skills`, `skills-lock.json`, `backend/src/lib/tests`, содержимое `answers/`/`reviews/`.
- Последствие: доки описывают более новый код, чем лежит в дереве; для работы линт-стека нужен `bun install` в `backend/` и `frontend/`. Файлы не коммитились, лежат в worktree.
- Источник: запросы пользователя от 2026-09-12.

### 2026-09-12: Доезд миграции бэкенда на hp_logger, автор в начало сообщения

- Решение: динамической смены автора в hp_logger 1.1.2 нет (проверено по `dist/api/logger.api.d.ts`: `author: readonly string`, методов `author()`/`setAuthor()` нет, задается только в `createLogger({author})` и `.module(name)`). Username пишется в начало сообщения: `` `${username} registered` ``, `` `${row.username} logged in` ``. Один shared root в `src/lib/logger.utils.ts` (`createAppLogger`), модули `SYSTEM`/`AUTH`/`MIGRATIONS` через `.module()`. В `LOGGER_SETTINGS` добавлен `stripControl: true` (имена и IP пользовательские). `index.server.ts` без `Bun.color`, стартап структурным контекстом, `installErrorHandlers` + `captureConsole`, конфиг-ошибки одним entry, `await logger.close()` перед exit, статичный импорт `rawDb`. Удален мертвый `src/types/logger.d.ts`. Попутно: named import Elysia в `services/index.service.ts` (красный lint из актуального конфига, файл чужой не грязный).
- Контекст: незавершенная миграция оставляла битые импорты удаленного `lib/logger.utils` в `migration.db.ts`/`error.plugin.ts` и несуществующие вызовы `logger.author()`/`logger.setAuthor()` в `auth.route.ts`.
- Последствие: `bun run typecheck` чисто, `bun run lint` 0/0, `bun run test` 11/11 (один файл `auth.test.ts`). Push падал на протухшей test-БД (`users_username_unique already exists`), вылечено удалением только `data/db.test.sqlite*`. Вне скоупа, не тронуто: `requestLog.plugin`/`withRequestScope`/`/metrics`/файловый транспорт из README (кода нет) и отсутствующий `scripts/` под `db:seed/clear/clone`.
- Источник: запрос пользователя от 2026-09-12.

### 2026-09-12: attempt/attemptSync из iluhaAnime, замена try/catch в backend

- Решение: `backend/src/lib/attempt.utils.ts` перенесен из `iluhaAnime/src/lib/utils/attempt.utils.ts` один в один по поведению (`toError`, `attempt`, `attemptSync`, `withFallback`, `reportBackgroundError`); стиль переписан под repo-lint (`export const` стрелками, `func-style` запрещает `function`-декларации). Все 9 try/catch backend переведены: `websocket.utils` (broadcast), `auth.utils` (resolveUsername), `images.utils` (decode), `migration.utils` (getAppliedMigrations), `path.utils` (поиск root), `index.server` (shutdown PRAGMA), `migration.db` (игнорируемые ошибки стейтментов), `index.utils` (resolveGeo - один try распался на два attempt: fetch и parse), `auth.route` (avatar 400).
- Решение: `resolveGeo` сохранил локальный `withFallback()` без импорта одноименного хелпера (сигнатуры разные: локальный без аргументов, импортный `(promise, fallback)`); `reportBackgroundError` оставлен на `console.warn` (уходит в логгер через `captureConsole`, прямой импорт логгера дал бы цикл по записи от 2026-09-12). Лишние null-ветки (`|| !avatar`, `|| !res`, `&& rows`, `|| !image`) убраны: `no-unnecessary-condition` доказывает их по типам. `path.utils` заодно починен от `continue` без продвижения (был потенциальный вечный цикл при бросающем `Bun.file`): проба вынесена в `hasPackageJson`, что убрало и `no-loop-func`.
- Контекст: явная команда пользователя перенести attempt/attemptSync и заменить try/catch backend (disposition `сейчас`, destination только DECISIONS.md - отдельный feature-файл не нужен). Старая запись про общий attempt с фронтом через shared-пакет не задета: хелпер скопирован локально в backend, без shared-пакета.
- Последствие: `bun run typecheck` чисто, `bun run lint` 0/0, `bun run test` 11/11. Поведенческих дельт нет: ветки ошибок и тексты сохранены, `migration.db` бросает тот же объект (toError возвращает тот же Error). Измененные файлы: `backend/src/lib/attempt.utils.ts` (новый), `lib/websocket.utils.ts`, `lib/auth.utils.ts`, `lib/images.utils.ts`, `lib/migration.utils.ts`, `lib/path.utils.ts`, `lib/index.utils.ts`, `src/index.server.ts`, `src/db/migration.db.ts`, `src/routes/auth.route.ts`. Вне скоупа, не тронуто: `Bun.env.BACKEND_ROOT` в `path.utils` (по DECISIONS dual-runtime файлам положен `process.env`, но `drizzle.config.ts` этот модуль не импортирует).
- Источник: запрос пользователя от 2026-09-12.

### 2026-09-12: Geo в backend/src/api/geo.api.ts, один провайдер, кэш

- Решение: IP/geo домен переехал из `backend/src/lib/index.utils.ts` в новый `backend/src/api/geo.api.ts` (outbound-клиент по конвенции `api/**/*.api.ts`); `auth.route.ts` импортирует оттуда. Поведение register не менялось, в `index.utils.ts` остались только время и проекции юзера.
- Решение: провайдер один - `https://ipapi.co`, параллельный опрос не делаем (запись волны D про параллель провайдеров больше не действует); `SECURITY.md` поправлен с "провайдерам" на singular, обещанный там кэш теперь реально есть (Map ip->geo, TTL 24ч, cap 1000 с вытеснением старейшего; кэшируется только успех провайдера, self-declared фолбэк не кэшируется).
- Решение: до fetch добавлены `isValidIp` (мусор из XFF отбрасывается до сети, в URL ip идет через `encodeURIComponent`) и trim; `isPrivateIp` покрывает IPv6 (ULA fc00::/7, link-local fe80::/10, documentation 2001:db8::/32, `::`, зоны `%`), v4-диапазоны сведены в таблицу `V4_PRIVATE_RANGES`; локальный `isStringRecord` оставлен (файла `lib/guards.utils.ts` из записи волны B в дереве нет, поднимать его ради двух строк не стали).
- Контекст: аудит по запросу пользователя, scope "сейчас узко" и правка журнала (ответы на вопросы). Отдельный feature-файл не нужен, причина: узкий рефактор без нового поведения.
- Последствие: `bun run lint` чисто, `bun run typecheck` чисто, `bun run test` 27/27 (11 auth + 16 новых geo в `backend/src/api/__test__/geo.test.ts`: приватные/валидация/XFF/requestIP/маппинг/фолбэк/кэш). По пути удален пустой untracked `backend/src/types/api.d.ts` (0 байт, ломал линт, кодом не является). Измененные файлы: `backend/src/api/geo.api.ts` (новый), `backend/src/api/__test__/geo.test.ts` (новый), `backend/src/lib/index.utils.ts`, `backend/src/routes/auth.route.ts`, `.docs/SECURITY.md`.
- Источник: запрос пользователя от 2026-09-12.

### 2026-09-12: Geo разложен на types/geo.d.ts, lib/geo.utils.ts, api/geo.api.ts, без класса

- Решение: сплит принят по явному выбору пользователя против рекомендации агента оставить один модуль (зафиксировано здесь, не переспрашивать): типы в `backend/src/types/geo.d.ts`, сетевые хелперы (`extractClientIp`, `isPrivateIp`, `isValidIp`, `resolveClientIp`) в `backend/src/lib/geo.utils.ts`, провайдер и кэш (`resolveGeo`) остались в `backend/src/api/geo.api.ts`. Класса GeoService нет: один потребитель и одна конфигурация, функции с инъекцией fetch покрывают тесты.
- Решение: чистка unknown узко: новый тип `GeoFetcher` в `types/geo.d.ts` убрал все `as unknown as typeof fetch` из тестов (стабы типизируются напрямую), `server: unknown` сведен к `RequestIpCapable`-гарду без `hasRequestIp`-танца и с сохранением this через метод-вызов. Остальной unknown (JSON границы, onError) оставлен как предписанный паттерн.
- Контекст: предложение пользователя сделать класс и разложить по файлам; вопросы geo_shape (функции плюс чистка) и geo_split (разложить). Отдельный feature-файл не нужен, причина: рефактор без нового поведения.
- Последствие: `bun run lint` чисто, `bun run typecheck` чисто, `bun run test` 27/27 в трех файлах (11 auth + 11 geo.utils + 5 geo.api). Поведение register не менялось. Измененные файлы: `backend/src/types/geo.d.ts` (новый), `backend/src/lib/geo.utils.ts` (новый), `backend/src/lib/__test__/geo.test.ts` (новый), `backend/src/api/geo.api.ts`, `backend/src/api/__test__/geo.test.ts`, `backend/src/routes/auth.route.ts`.
- Источник: запрос пользователя от 2026-09-12.

### 2026-09-12: Geo-константы в config/geo.config.ts

- Решение: все статические значения geo переехали в новый `backend/src/config/geo.config.ts` по конвенции (провайдер `GEO_URL`, `GEO_TIMEOUT_MS`, `GEO_CACHE_TTL_MS`, `GEO_CACHE_MAX`, таблица `V4_PRIVATE_RANGES`, `IPV4_RE`/`IPV6_RE`); env-оверрайдов нет, значения не менялись. `GeoCacheEntry` в `types/geo.d.ts` - правка пользователя между ходами, оставлена как есть.
- Контекст: запрос пользователя вынести конфиги и хардкод. Отдельный feature-файл не нужен, причина: рефактор без нового поведения.
- Последствие: `bun run lint` чисто, `bun run typecheck` чисто, `bun run test` 27/27. Поведение не менялось. Измененные файлы: `backend/src/config/geo.config.ts` (новый), `backend/src/api/geo.api.ts`, `backend/src/lib/geo.utils.ts`.
- Источник: запрос пользователя от 2026-09-12.

### 2026-09-12: GeoService класс с проводкой через servicesPlugin

- Решение: `backend/src/api/geo.api.ts` теперь класс `GeoService` (конструктор `GeoServiceOptions`: fetchFn, timeoutMs, cacheTtlMs, cacheMax с дефолтами из `config/geo.config.ts`; метод `resolve(ip, fallback, onError?)`; приватный инстанс-кэш с TTL и cap; `clearCache()`). Модульные `resolveGeo`/`clearGeoCache` и тип `ResolveGeoOptions` удалены. Синглтон строится один раз в `services/index.service.ts` и едет в хендлеры через контекст (`geoService`), роут импортов api больше не имеет.
- Решение: строка "класса нет" из предыдущей geo-записи за сегодня отменена прямым указанием пользователя; классы сервисов (`UserService`, теперь `GeoService`) считать принятым паттерном для stateful-зависимостей роутов.
- Контекст: прямое требование пользователя после спора про класс. Отдельный feature-файл не нужен, причина: рефактор без нового поведения.
- Последствие: `bun run lint` чисто, `bun run typecheck` чисто, `bun run test` 27/27 (auth end-to-end идет через инжекченный синглтон). Поведение register не менялось. Измененные файлы: `backend/src/api/geo.api.ts`, `backend/src/api/__test__/geo.test.ts`, `backend/src/types/geo.d.ts`, `backend/src/services/index.service.ts`, `backend/src/routes/auth.route.ts`.
- Источник: запрос пользователя от 2026-09-12.
