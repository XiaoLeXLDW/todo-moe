# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately through [Todo Moe private vulnerability reporting](https://github.com/XiaoLeXLDW/todo-moe/security/advisories/new). Do not open a public issue for anything exploitable or include secrets, private task data, or proof-of-concept details in a public report.

There is no guaranteed response time or bug bounty. Fixes may be credited in release notes unless you prefer otherwise.

## Supported versions

Only the latest release receives security fixes. Older tags are immutable and are never patched in place — a fix always ships as a new version.

## Supply-chain posture

- GitHub Actions are pinned to full commit SHAs.
- CI and release builds install dependencies with `bun install --frozen-lockfile`; the committed `bun.lock` is the source of truth.
- A scheduled dependency audit workflow reviews advisories for the dependency tree.
- Install scripts from dependencies are only expected for native builds (for example `better-sqlite3` in the cloud/MCP Docker images); new dependencies that need install scripts get extra review.

## Scope notes

Todo Moe currently distributes the Android app and its release pipeline. This repository retains upstream code for other platforms and services, but that does not mean Todo Moe operates or supports those services. Report fork-specific Android, privacy, update, build, and release issues here; report vulnerabilities that affect unmodified Mindwtr upstream code to the upstream project as well.
