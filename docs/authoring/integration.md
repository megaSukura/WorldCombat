# 集成者职责

本文件面向协调与集成任务。独立内容 Agent 负责源码交付、单元检查与自己的冒烟场景，集成者负责公共基线、跨单元装配及共享变更。

合并共用接口与依赖，再装配内容。集中检查类型、资源冲突、行为和原生接口，按改动范围选择回归；完成后交付用户可玩的稳定版本。测试夹具仍只作为工程证据，范本按用户认可范围收录。

每轮生产的稳定边界，在仓库根目录运行 `node tools/build-content.mjs`，准备共享基线及单元路径索引。作者的私有构建只读取所选单元与依赖，新单元按目录传入；验证入口仍是 `check-unit` 与 `smoke-unit.py`。正式招式派发使用[任务模板](moves-template.md)，分组清单由 `python tools/plan-move-batches.py` 生成。

集成选定内容的命令：

```powershell
node tools/build-content.mjs --selection path/to/selection.json --output build/integration/batch
.\gradlew.bat --gradle-user-home .gradle-user check assembleDist
.\gradlew.bat --gradle-user-home .gradle-user --init-script tools/export-server-checks.gradle :cobblemon-world-combat:exportServerCheckLaunch
node tools/install-demo.mjs runs/review-instance --from build/integration/batch
```

指定单元也可用 `--units namespace:id` 或 `--units content/moves/<id>`；新单元使用目录，已有 id 从基线索引定位。输出独占；集成者统一更新正式选集。Mod 或启动注册发生变化时使用对应的新产物并重启。原生检查入口是 `python tools/check-server.py --help`；可见测试按 AGENTS.md 安排。

## 生产交回与按需修正

作者完成本组可完成的内容与验证，随组交回“已完成／待前置”状态、阻塞位置与未完成部分。协调者以落盘报告和源码统计交回情况；批量调用中断后也按实际交付继续。

需要处理的共享请求由集成者去重并核实：已有接口的用法与单元实现问题，附准确入口纳入相关单元任务；确实影响本轮目标的公共能力缺口由集成者补齐。便利性与可选抽象保留为建议。

共享补充优先采用兼容扩展，发布接口与验证依据，并按实际调用方确认影响范围。委派修正时，每次按新作者接手准备自包含任务，明确当前源码、问题证据、目标和验证要求。作者完成本轮修改与两项验证，集成者按影响范围选择回归和跨单元检查。

后续体验反馈遵循[有限范围改进约定](feedback.md)。本轮工作范围以用户目标、实际证据和成本为依据，交接中写明已交付内容、验证范围与待完成事项；当前批次状态见[开发交接](../development/P5-progress.md)。
