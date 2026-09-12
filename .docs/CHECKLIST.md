# Risovach Implementation Checklist

## Before coding

- [ ] List available MCP servers (context7, fetch, sqlite, playwright) and use task-relevant tools;
- [ ] Read `.docs/AGENT_PROMPT.md`, `DEVELOPMENT.md`, `TESTING.md`, `SECURITY.md`, `DESIGN.md`, and `DECISIONS.md` as relevant; read `DECISIONS.md` before the audit.
- [ ] Check parallel-session changes before asking or writing.
- [ ] Read the relevant module source, tests, configs, bindings, module README, and package scripts.
- [ ] Search existing components, stores, hooks, helpers, and dependencies.
- [ ] Search for existing similar implementations by concept (synonyms, related terms, similar shapes), not only by name, before writing new logic.
- [ ] Walk the minimalism ladder before writing new code.
- [ ] Check `package.json`, lockfile, and existing usage of suitable packages; compare modern candidates (fit, support, license, size, security surface) when nothing installed fits.
- [ ] Identify trust boundaries and capabilities touched.
- [ ] Ask implementation disposition and documentation destination for new features.
- [ ] Clarify material ambiguity before implementation; restate the interpretation in one sentence when unclear.
- [ ] Run the socratic brainstorm gate for non-trivial work: restated intent confirmed, alternatives considered, scope in small reviewable chunks.
- [ ] Check the anti-rationalization table: name any excuse for skipping steps and apply the required response.
- [ ] Define behavior, states, errors, invariants, and test matrix.
- [ ] Group questions without junk; short plain-language labels, consequences included, `(recommended)` only on individually justified options.

## During coding

- [ ] Keep one source of truth for state.
- [ ] Preserve established directories and dot-suffix naming.
- [ ] Keep TypeScript strict and avoid explicit `any`.
- [ ] Keep heavy server and canvas work off the UI thread.
- [ ] Fix shared root causes, not single paths; verify callers via grep.
- [ ] Re-read target files right before editing when loaded earlier in the session.
- [ ] Implement loading, empty, error, disabled, stale, dirty, and recovery states where applicable.
- [ ] Reuse existing UI components.
- [ ] Preserve neo-brutalism styling (radius 0, 2px borders, hard shadows, mono font).
- [ ] Keep UI copies short, direct, in Russian.
- [ ] Add tests with the behavior change.
- [ ] Run the adversarial test pass: ask what broken implementation would still pass.
- [ ] Run verification-before-completion: reproduce, fix, rerun reproduction plus suite, show output.
- [ ] Apply two-stage review per step for multi-step work.
- [ ] Declare new outbound or host capabilities in `.docs/SECURITY.md` and `.docs/DECISIONS.md`.
- [ ] Avoid debug logs, dead code, fake data, and speculative abstractions.

## Verification

- [ ] Run `bun run lint`.
- [ ] Run `bun run typecheck`.
- [ ] Run `bun run test` or the relevant targeted test.
- [ ] Run `bun run build` for build-affecting changes.
- [ ] Run `bun run test:ci` in backend for behavior-affecting changes when available.
- [ ] Record unavailable coverage, mutation, fuzz, stress, and security commands with reasons.
- [ ] Review the diff for accidental network, process, filesystem, environment, or dynamic-execution changes.
- [ ] Check for secrets, explicit `any`, em/en dashes, debug logs, placeholder data, and comment-parrots.
- [ ] Run the deslop self-check on touched texts (catalog in `.docs/DEVELOPMENT.md`).
- [ ] Check data flow, file locations, naming, UI states, and keyboard access.
- [ ] Verify commit messages contain no AI agent credits or co-author trailers.
- [ ] Mass text-file edits use explicit UTF-8 encoding; content spot-read after writing.
- [ ] Update `.docs/DECISIONS.md` before the final report.

## Feature files

- [ ] Use Idea, Comment, Pros, and Cons.
- [ ] Keep plain paragraphs and short lists.
- [ ] Add alternatives when the main option is weak.
- [ ] Avoid decorative formatting and invented code.

## Documentation

- [ ] Record disposition and documentation destination.
- [ ] Update decisions for significant changes and behavior fixes.
- [ ] Update design rules for approved visual changes.
- [ ] Update README when commands or user-facing structure changes.
- [ ] Suggest independent review for large changes.
- [ ] Report what was verified and what remains unverified.
