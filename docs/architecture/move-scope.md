# 招式与原生数据范围

最终范围沿用：锁定 Cobblemon 默认数据与本项目明确启用规则下，可学习、获得或在战斗中产生的全部招式。P4 完成能力与范围核对，P5 设计代表性正式内容，P8 完成全量生产。

## 当前基线（2026-09-13）

P4 直接读取 Gradle 实际加载的 `neoforge-1.8.0+1.21.1.jar`，其中 `data/cobblemon/showdown.zip` 的版本为 18。源文件包含 952 个招式键，16 个带属性的觉醒力量键归并为 `hiddenpower`，得到 **936 个原生招式标识**，与完整专服导出的实际注册逐项一致。

P0 的 [move-ids.txt](../../manifests/move-ids.txt) 保留当时调查文件的 931 个键。当前依赖中的源文件增加 21 项，再归并上述 16 个别名；这解释了早期快照与运行注册的差异。具体新增项和别名见[清点摘要](../../manifests/native-inventory.json)。

| 清单 | 用途与解释 |
| --- | --- |
| [原生招式](../../manifests/native-moves.csv) | 936 项，包含属性、分类、物种数据声明的学习来源及机制线索；特殊回调继续人工核对 |
| [原生特性](../../manifests/native-abilities.csv) | 314 项，记录物种数据来源和上游效果回调入口 |
| [道具参考](../../manifests/native-items.csv) | 537 项上游战斗道具参考，附原生物品名称候选；当前实际注册的 Cobblemon 物品共 749 项 |

学习来源包括等级、蛋招式、TM、导师等数据声明；获得入口、物种可用性和调用条件需要结合实际游戏路径确认。道具名称候选用于定位适配入口，具体行为以原生实现核对为准。数据声明和机制线索的覆盖结果见 [P4 需求对应](P4-requirements.md)。

通过[清点工具](../../tools/native-inventory.py)复查，完整专服的真实导出入口见[注册检查](../../mods/cobblemon-world-combat/src/test/kotlin/dev/worldcombat/cobblemon/checks/NativeScopeChecks.kt)。当前阶段用共用机制及代表场景验证能力；正式招式设计与验收随 P5／P8 推进。
