# Todo Moe

Todo Moe is an Android task manager based on [Mindwtr](https://github.com/dongdongbh/Mindwtr). It keeps the upstream local-first task model while adding Todo Moe's checklist execution, completion feedback, Android presentation, and native glass navigation.

[简体中文](README_zh.md) · [Download](https://github.com/XiaoLeXLDW/todo-moe/releases/latest) · [Help](HELP.md) · [Privacy](PRIVACY.md) · [Report an issue](https://github.com/XiaoLeXLDW/todo-moe/issues/new/choose)

## Daily use

- Today, projects, sections, areas, and Inbox use the existing Mindwtr entities and storage.
- Checklist tasks can expand in place; individual steps persist immediately and the final step can complete the parent task.
- Completion motion, haptics, themes, and glass effects can be adjusted or disabled.
- Local use needs no account. Exported backups and optional sync remain user-controlled.
- Stable and Dev builds have separate Android identities and separate data.

## Install and update

The current public build is [Todo Moe 0.4.2 / Stable vc53](https://github.com/XiaoLeXLDW/todo-moe/releases/tag/moe-v0.4.2-vc53). Download the Stable APK from Releases and install it over an existing Stable build; do not uninstall first. Export a backup before an important upgrade.

Todo Moe currently ships Android builds. Other upstream platform sources remain in the monorepo for compatibility and maintenance; their presence does not mean Todo Moe publishes or validates those platforms. Release-specific changes and validation boundaries are recorded in the [Todo Moe version index](docs/todo-moe/docs/versions/README.md).

## Development and maintenance

Start with [AGENTS.md](AGENTS.md), [CONTEXT.md](CONTEXT.md), and the [current Todo Moe maintenance entry](docs/todo-moe/README.md). Android build and delivery details live in [WINDOWS-BUILD.md](docs/todo-moe/WINDOWS-BUILD.md) and [ANDROID-DELIVERY.md](docs/todo-moe/ANDROID-DELIVERY.md).

Product changes use pull requests and the checks appropriate to the changed paths. A public Stable release requires explicit authorization and the owned `moe-*` workflow; build success, APK verification, device testing, and publication are separate evidence. The vc53 release was rebuilt and published from merged `main` by [the controlled workflow](https://github.com/XiaoLeXLDW/todo-moe/actions/runs/35431747383).

## Origin and license

Todo Moe is an independently branded personal fork. Mindwtr authorship and Git history remain intact. The repository is licensed under [GNU AGPL v3 only](LICENSE); reused components retain their own licenses. See [THIRD-PARTY.md](THIRD-PARTY.md) for component notices and glass implementation attribution.

The Android app includes the AGPL text and generated third-party notices under About → Open-source licenses and acknowledgements. Regenerate those notices with `node scripts/moe/generate-license-notices.mjs` after mobile runtime dependencies change.
