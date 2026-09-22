# 开发回归内容

本目录保留自动检查所需的技能、具体策略、场景和绘图材料，包括结构调整中的隔离组合。它们独立构建，默认内容与 `dist/` 均不包含这些包。旧模态指挥界面已删除。

本目录的内容用于工程回归。内容生成的范本按[用户游戏验收认可的范围](../../docs/development/content-authoring.md)选取；新增隔离组合尚未取得这项认可。

运行 `node tools/build-content.mjs --tests`，或使用完整 Gradle `build`；输出位于 `build/test-content/`。[包清单](packs.json)只定义测试包，并引用正式的共享库。隐藏专服检查由 `tools/check-server.py` 显式选择对应组合。

用户试玩使用当批准备的版本和操作说明。P4 的反馈与正式设计接续见[验收记录](../../docs/development/P4-checks.md)。
