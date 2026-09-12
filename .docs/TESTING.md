# Risovach Testing Contract

## 1. Test setup

Backend (`backend/`, раннер `bun test`):

- Unit/integration command: `bun test` (перед ним схема применяется к test-БД: `NODE_ENV=test bunx drizzle-kit push --force`; скрипт `test` делает оба шага сам).
- Full command: `bun run test`; CI-вариант: `bun run test:ci` (coverage, retry 2, randomize, `--bail=1`).
- Coverage command: `bun run test:ci` (флаг `--coverage` внутри скрипта).
- Mutation command: `unavailable - no mutation tool or script is configured`.
- Benchmark command: `unavailable - no benchmark script is configured`.
- Fuzz or property command: `unavailable - no property or fuzz runner is configured`.
- Typecheck: `bun run typecheck` (`tsc --noEmit`); lint: `bun run lint` (`oxlint --type-aware --deny-warnings`).
- Test DB: `data/db.test.sqlite`, прод-файл `data/db.sqlite` тесты и dev затрагивать не должны (сервер отказывается стартовать на прод-БД вне production).
- Test isolation: свежие БД на прогон через push, чистка через `beforeEach`, без зависимости от порядка; без production-файлов, сети, креденшелов и машинных путей.
- External services: гео-провайдеры подменяются fake-fetcher на границе; deterministic-фикстуры (например base64 PNG для аватаров).

Frontend (`frontend/`):

- Full command: `bun test` (alias `@/` резолвится через `baseUrl`+`paths` в корневом `tsconfig.json`).
- Typecheck: `tsc -b` (и `tsc --noEmit -p tsconfig.app.json`); lint: `bun run lint`; `bun run check` / `bun run fix` через ultracite.
- Coverage/mutation/fuzz/benchmark: `unavailable - no script is configured`.

Unavailable commands are written as `unavailable` with a reason. A command is never implied by a framework name.

## 2. Behavior before tests

Define public input, output, state changes, persistence, server side effects, stable errors, cleanup, recovery, and invariants that must survive transformations or repeated operations before writing tests. Read the relevant store, component, utility, route, service, config, and existing tests. Keep implementation details private unless they are part of the behavior contract. If the intended behavior is ambiguous and the choice changes the test, ask or record the assumption before coding.

## 3. Test design

Cover normal, empty, minimal, boundary, malformed, duplicate, repeated, out-of-order, failure, partial failure, retry, cleanup, cancellation, and recovery cases where the contract allows them. Record each axis as covered, not applicable with a reason, deferred with a return condition, or unavailable with a reason. Every test answers: "What meaningful regression would make this test fail?" A test with no clear answer is removed or redesigned.

## 4. Assertions and names

Assert observable results, rendered state, store state, emitted notifications, persisted values, and stable errors. Prefer exact assertions over truthiness. Names describe condition and behavior, such as `restores persisted settings without overwriting defaults`. Keep one main behavior per test; use parameterized tests when data changes but the behavior does not. Arrange, Act, Assert is the default structure without phase comments when the code already makes the phases clear.

## 5. Test levels and boundaries

Pure transformations and domain rules belong in unit tests. Store persistence, serialization, filesystem, SQLite, and protocol behavior belong in integration-level tests when a safe boundary exists. End-to-end tests are limited to critical paths where lower levels cannot prove the contract. Mock or fake network, clocks, randomness, filesystem, and external services at the boundary, not internal functions. No test uses production credentials or network access.

## 6. Edge cases and errors

Consider empty strings, whitespace, zero, negative values, large values, Unicode, malformed JSON, duplicate usernames, oversized avatars, undecodable images, missing files, corrupted persistence, geocoder failures, rate-limiter windows, and shutdown cleanup. Assert stable error behavior and recovery, not incidental message wording.

## 7. Async and concurrency

Use promises, explicit events, barriers, and completion signals. Never synchronize with sleeps. A fake clock is allowed only when time is a boundary of the behavior and the test advances it explicitly. Cover stale query results, cancellation, duplicate events, watcher cleanup, background progress ordering, and store updates that can overlap when applicable. Concurrency tests must control the schedule so that a failure is repeatable.

## 8. Properties, fuzzing, and mutation

Property, fuzz, and mutation commands are unavailable in the current project configuration. When a changed pure function has a clear invariant, add deterministic example coverage now and record a future property or fuzz return condition in its feature decision. Fuzz and property runs use deterministic seeds and an explicit oracle; save a minimal reproducer for every discovered failure. Perform mental mutation review and report that it is not a mutation score.

## 9. Regression-first

Reproduce a bug, add a failing behavior test, verify the failure reason, fix the shared root cause, rerun the regression, then rerun the relevant suite and full checks. Grep all callers before changing shared utilities or stores. Do not change production code only to make a weak test pass.

## 10. Performance and load

Correctness tests are separate from benchmarks and stress checks. A performance analysis pass is required for every task; an executable benchmark is added only when the changed path is performance-sensitive or has a stated budget. A benchmark records environment, workload, baseline, current result, and difference. Frontend performance checks are analysis-only unless a changed path has a stated budget. Do not quote numbers without an artifact.

## 11. Coverage and quality

Coverage comes from `bun run test:ci` (backend). Review branch, error, state, and critical-path behavior manually. High line coverage does not replace missing behavior assertions. Do not add tests solely to satisfy a percentage.

## 12. Existing test-suite migration

The existing suite is the baseline. Record the command and result before changing tests. Inventory tests by component, config, hook, library, route, and store. Add missing behavior and regression cases before deleting anything. Strengthen weak assertions, add missing behavior and regression cases, and remove duplicates only after equivalent coverage is shown. Re-run the baseline commands and compare failures and duration. Do not rewrite the suite for style alone.

## 13. Required review passes

### Pass 1: design and implementation

Understand behavior, create the matrix, choose test levels, write tests, and run the relevant checks.

### Pass 2: adversarial attack

Assume the tests are wrong until proven otherwise. Ask what broken implementation would still pass. Check weak assertions, false positives, missing branches and errors, mock abuse, duplicated coverage, implementation coupling, flakiness, and missing edge cases. Apply the full axis checklist even when the result is not applicable or unavailable with a reason.

### Pass 3: verification

Run tests, typecheck, lint, coverage, and configured advanced checks. Record exact results and separate passed, failed, skipped, not applicable, and unavailable checks.

## 14. Test report

Report the behavior contract, assumptions, matrix, changed tests, error and edge coverage, determinism, isolation, async/concurrency, performance, unavailable advanced checks, exact commands, results, and remaining risks. Always ask: `What behavior could be broken while these tests still pass?`

### Reference patterns

- **DAMP over DRY in tests**: tests repeat setup to stay readable; shared helpers only for true fixture complexity.
- **Beyonce Rule**: if you liked it then you should have tested it; any observed behavior worth keeping deserves a test.
- **Definition of done**: behavior matrix complete, tests prove the matrix rows, verification passes 1-3 recorded, docs updated, DECISIONS.md entry added.
- **Anti-patterns to avoid**: `toBeTruthy` where exact value matters, asserting call counts instead of observable outcome, testing private fields, snapshot of large objects without intent, sleep-based async sync.
- **Test pyramid**: many unit tests for domain rules, fewer integration tests for persistence/protocol, minimal end-to-end for critical paths only.
