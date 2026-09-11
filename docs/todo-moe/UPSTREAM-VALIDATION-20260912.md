# 上游稳定版本发现实测 · 2026-09-12

已实际运行`node scripts/moe/upstream.mjs discover`，没有创建分支、worktree、PR或定时任务，也没有启用任务数据同步。

| 字段 | 实际结果 |
|---|---|
| 查询时间 | 2026-09-12 02:54:49北京时间 / 2026-09-11T18:54:49.881Z |
| 当前源码 | `5a36c0b1b7b4091cbff6c839676dff1fa26e6a8a` |
| 上游仓库 | `dongdongbh/Mindwtr` |
| 最新语义稳定Release | `v1.2.8` |
| 上游完整SHA | `9f94211faecc2d1463403b7458069391f5c9d99c` |
| 脚本状态 | `no-update`，退出0 |
| Git关系复核 | `git merge-base --is-ancestor 9f94211faecc2d1463403b7458069391f5c9d99c 5a36c0b1b7b4091cbff6c839676dff1fa26e6a8a`退出0 |

脚本实际读取GitHub Release列表，排除草稿和预发行，按语义版本选择稳定目标。这个稳定提交已在当前源码历史中，因此不重复合并，也不把原fork的1.3.0 main快照重新命名为稳定Release。上游可能继续变化，本记录只证明上述查询时间的结果。

本地原始结果：`evidence/development/upstream-discovery-20260912.log`；脚本标准输出为`build/moe/upstream-report.json`。后续发现会覆盖标准报告，带日期的日志保留这次结果。

已有`upstream-merge.test.ts`用真实临时Git仓库验证双亲合并、幂等和冲突后abort保留原内容；它属于宿主测试，不是远程同步PR演练。本次没有新的稳定版本可用于实际成功合并链，QA-12的“同步PR、精确提交检查与对应APK”仍未全范围通过。正式工作流部署和发行继续遵循[交付流程](ANDROID-DELIVERY.md)。
