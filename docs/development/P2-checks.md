# P2 检查记录

**2026-09-13：P2 完成。两批试玩已有实际结果，用户确认头顶文字修复成功并同意阶段收尾。相关构建、后台场景与真实重启检查通过。**

| 范围 | 已取得的结果 |
| --- | --- |
| 构建与运行时 | 两个 Mod、TypeScript 内容及类型声明构建通过；14 项运行时检查与 2 组输入／请求检查通过 |
| P1 回归 | 核心独立与完整组合的隐藏专服场景通过，覆盖投射、阻挡、结算、收回、旧入口、异常隔离及重载 |
| 普通玩家指挥 | 实际请求入口通过所属、代次、版本、重复请求校验；技能执行、冷却、短队列替换／过期及收回清理通过 |
| 持续控制与 AI | 手动优先、原生守位寻路并停止、逐槽自动授权及捕捉目标让出通过 |
| 世界作用 | 实际减伤、持续结束、岩障碰撞与到期、拆改保留、伙伴离开清理、原生方块存储及第二次进程启动恢复通过；冲刺遵循实际碰撞 |
| 原生捕捉与成长（后台） | 实际物品投球、失败恢复、成功只入队一次、旧句柄失效、重新放出及经验结算通过；真实重启后个体、经验与战术授权恢复通过 |
| 第一批人工试玩 | 用户确认快捷／精确输入、空选择、取消、界面／失焦、切物品、挖建、改键、备用预设和低粒子提示全部正常；客户端退出码 0 |
| 第二批人工试玩 | 用户确认 AI 达到清单中的功能效果，同时反馈面板操作与外观、AI 玩家体验欠佳。日志确认原生捕捉、新伙伴多次获得经验及正常保存退出 |
| 渲染复验与收尾 | 用户确认头顶文字渲染修复成功；日志确认重新进入原存档、全部维度保存及客户端正常关闭 |

平地冲刺的受阻误报与恢复意图停顿已修复，隐藏专服验证了平地预览、及时恢复守位／跟随和旧寻路等待清理；真实墙体碰撞、防护与岩障清理回归通过。冲刺修正的手感未另获单独反馈，后续移动相关试玩继续观察。

头顶文字缺失及转动视角时缺字已修正，用户复验通过。当前绘制见[伙伴标记](../../mods/cobblemon-world-combat/src/main/java/dev/worldcombat/cobblemon/client/CompanionMarker.java)。

本轮交付使用开发指挥面板、统一的四个开发动作和简化示例战术。后续事项包括改善常用指令操作与配置反馈、提高 AI 决策的玩家价值，以及随正式招式接入形成伙伴配招差异；对应工作先计划、后审阅。持续意图、授权与寻路继续作为玩法基础。

检查入口：[冲刺恢复](../../mods/cobblemon-world-combat/src/test/kotlin/dev/worldcombat/cobblemon/checks/MovementServerChecks.kt)、[运行时](../../mods/world-combat-core/src/test/java/dev/worldcombat/core/runtime/RuntimeChecks.java)、[请求](../../mods/cobblemon-world-combat/src/test/kotlin/dev/worldcombat/cobblemon/checks/InputServerChecks.kt)、[世界作用](../../mods/world-combat-core/src/test/java/dev/worldcombat/core/checks/WorldEffectChecks.java)、[AI 与捕捉](../../mods/cobblemon-world-combat/src/test/kotlin/dev/worldcombat/cobblemon/checks/TacticsCaptureChecks.kt)。重启检查使用实际写入的原生存档。

捕捉后台场景固定最后一段投球轨迹及成功／失败结果，经过原生碰撞、动画、结算和入队；实际人工投球另有第二批日志佐证。原生个体、经验及战术配置的保存恢复由真实重启检查覆盖，本次客户端重入未逐项获得人工核对反馈。

第二批客户端曾在第一组反馈后意外退出，日志未确认原因。启动器随后改为独立进程并冻结本地 jar，“新的世界”存档已备份；用户确认后继续原存档，后续两次试玩均正常保存退出。

冻结的试玩目录与后台专服世界互相独立。专服显式使用 `--nogui`，日志位于 `build/p2-input-checks/`、`build/p2-world-checks/`、`build/p2-capture-checks/` 和 `build/p2-movement-checks/`。操作步骤见[试玩清单](P2-use.md)。

第一批新世界首次入场出现与 P1 相同的上游默认数据缺失日志，随后保存正常。真实多客户端同步按已批准计划，在首次联机前执行；人工体验与专项覆盖只按实际取得的结果记录。

P2 交付包含两个 Mod jar、编译后的脚本及作者类型，构建方法见[构建说明](getting-started.md)。P2 后用户已授权修订路线并启动 [P3 原生能力适配](../plans/P3.md)，扩展性验证继续贯穿后续阶段；`dist/` 随当前开发构建更新。
