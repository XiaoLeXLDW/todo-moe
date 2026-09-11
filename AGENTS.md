# Todo Moe maintenance

Read `CONTEXT.md` before changing task placement, capture, completion or sync. It is the preserved upstream domain guide. The mobile words 文件夹/清单/分组 map to Area/Project/Section; use the original entities and store operations.

For scope and acceptance, read `docs/todo-moe/IMPLEMENTATION.md` and the relevant version record under `docs/todo-moe/docs/versions/`. Keep code, automated checks, APK verification, device observations and publication status distinct. A successful build is evidence of compilation; runtime acceptance requires the corresponding device or backend record.

Keep mobile presentation in `apps/mobile/moe` and the Android glass module in `apps/mobile/modules/moe-glass`. Start business operations immediately through the upstream store; visual completion callbacks manage presentation only. Validate failure, undo, recurrence and concurrent actions when changing task feedback. Theme preferences are local presentation settings, separate from synced task data.

For Android builds or Windows tooling failures, follow `docs/todo-moe/WINDOWS-BUILD.md` and `docs/todo-moe/ANDROID-DELIVERY.md`. Preserve generated/native work until its ownership is known. Use the project-local `.tools` runtime and caches; keep them excluded from Metro and Git. Date-sensitive test fixtures run with `TZ=UTC` in the test process. Run full mobile regression without a simultaneous native compile when checking timeout failures.

For brand, deep links or sync settings, read `docs/todo-moe/IDENTITY-AUDIT.md`. Dev and Stable have independent identities; remote data isolation additionally needs an independent target. Change self-references through the mobile brand adapter, keeping upstream attribution, compatible backup/provider names and existing task text intact.

For upstream updates, signing or releases, use `scripts/moe` and the owned `moe-*` workflows. Preserve merge ancestry, exact source SHA, channel, monotonic versionCode and verified APK/certificate hashes. Keep signing material and real sync credentials outside source and logs. Record failed or unperformed checks explicitly; continue to follow the user's current authorization for any external operation.

Source: the user's 2026-09-11 fork-development request and the project requirements. User instructions for the current task take precedence over this guide.
