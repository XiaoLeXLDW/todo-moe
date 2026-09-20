# Contributing to Todo Moe

Todo Moe is an Android-focused fork of [Mindwtr](https://github.com/dongdongbh/Mindwtr). Contributions to Todo Moe belong in `XiaoLeXLDW/todo-moe`; changes intended only for upstream Mindwtr should follow the upstream project's own guide and policies.

## Before starting

1. Follow the repository [Code of Conduct](../.github/CODE_OF_CONDUCT.md).
2. Report vulnerabilities through [SECURITY.md](../SECURITY.md), not a public issue.
3. Open or confirm an issue before a non-trivial behavior change.
4. Keep data compatibility, accessibility, failure handling, and upstream attribution in scope.

## Repository boundaries

- `apps/mobile` contains the Android/iOS Expo application; Todo Moe product presentation is concentrated under `apps/mobile/moe` and the Android glass module.
- `packages/core` owns shared task, storage, recurrence, backup, and sync behavior.
- Desktop, cloud, MCP, iOS, packaging, and upstream workflows remain because the monorepo and governance checks reference them. Their presence does not make them Todo Moe release targets.
- Preserve upstream package names and compatibility keys unless a migration plan proves every reader and writer remains compatible.

Read [AGENTS.md](../AGENTS.md), [CONTEXT.md](../CONTEXT.md), and the [current Todo Moe maintenance entry](todo-moe/README.md) before changing product behavior.

## Development workflow

1. Create a focused branch from current `main`.
2. Make the smallest coherent change and add regression coverage for behavior changes.
3. Run the checks appropriate to the affected paths.
4. Review the diff for unrelated files, credentials, generated output, and stale documentation.
5. Open a pull request to `XiaoLeXLDW/todo-moe:main` with the change, reason, and evidence.

Use Conventional Commits where practical, for example `fix(mobile): preserve checklist undo state` or `docs: refresh release entry`.

## Local setup and checks

The repository is a Bun monorepo. Use the version in `.bun-version`; on the maintained Windows checkout, follow [WINDOWS-BUILD.md](todo-moe/WINDOWS-BUILD.md) and use the project-local toolchain.

```bash
bun install
bun run docs:check-readme
bun run typecheck
bun run lint:all
bun run test
```

`bun run verify` also includes native, governance, locale, schema, and README checks. Run it when the changed paths require the full gate. Android build success is compilation evidence, not device acceptance; record installation and behavior separately.

## Pull requests

Keep one product change or one maintenance topic per PR. Include:

- what changed and why;
- affected platform or package;
- exact commands and results;
- device evidence only when it was actually observed;
- screenshots for visible UI changes;
- remaining limitations or checks not run.

Public Stable releases, signing, repository settings, and branch protection require separate explicit authorization. Use the owned `moe-*` workflows rather than adapting upstream publish jobs.

## Documentation and translation

Keep `README.md` and `README_zh.md` structurally aligned; CI runs `bun run docs:check-readme`. Put current Todo Moe status in `docs/todo-moe/README.md`, release-specific evidence in `docs/todo-moe/docs/versions/`, and upstream release history in `docs/release-notes/`.

Locale sources live in `packages/core/src/i18n/locales/`. After changing a `starter.*` string, run `bun run scripts/i18n-locale-parity.ts --fix` and `bun run i18n:check`; do not edit the generated starter seed file by hand.

## License and attribution

Contributions are accepted under [AGPL-3.0-only](../LICENSE). Retain applicable copyright notices, third-party licenses, and upstream history. This fork does not impose Mindwtr's separate CLA on Todo Moe pull requests.
