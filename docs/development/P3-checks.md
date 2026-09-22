# P3 进度与检查

**2026-09-13：P3 开发、后台技术检查及合并人工验收完成。** 用户反馈清单项目正常，并提出移动速度与多伙伴接管两项观察，作为 P4 的设计输入。P3 与 P4 的共同完成条件继续按[阶段计划](../plans/P3.md)执行。

## 原生能力覆盖

| 能力 | 已实现与实际检查 | 接续工作 |
| --- | --- | --- |
| 个体、队伍、模型与所属 | 原个体 UUID 和存储；放出／收回、PC 存取、交换、唯一归属及旧句柄失效 | 联机操作体验随 P6 验证 |
| 六维、IV／EV、性格、属性 | 当前原生属性提供者；薄荷、极限特训糖果、努力值道具实际生效；培养改变脚本伤害，物理／特殊及属性关系通过命中检查 | 完整伤害修正项接 P4 |
| 配招与 PP | 读取真实个体招式；换招、排序、遗忘／回忆、提交扣费、原生恢复及保存重启通过；人工核对技能栏与原生界面正常 | 随新效果检查资源交互 |
| 经验、努力值、亲密度、学招 | 脚本选择野生击败收益及学习装置分享；原生事件、上限、升级、亲密度、学招继续执行 | 收益节奏随正式内容试玩调整 |
| 进化与成长记录 | 原生普通／交换进化；已提交招式使用、实际受伤、指定目标击败记录；进度保存重启通过 | 反伤与会心触发、遭遇内计数边界接 P4 |
| 道具与形态 | 原生 Potion、Ether／Elixir、Protein、糖果、薄荷、特性膏药入口；形态改变实时反映到类型和能力值 | 特性／携带物的战斗效果接 P4 |
| 捕捉 | 原生投球与捕获流程；脚本适配快速、计时、等级、甜蜜、狩猎球的即时条件，其他原生倍率及捕获效果继续使用 | 新状态通过 P4 的同一原生状态接口影响捕捉 |
| 原生行为 | 进化、休息、骑乘时交还控制；“自由活动”释放原生 AI，手动动作结束后继续原生活动；专服实际验证原生跟随恢复 | 更广泛生活行为与交互按锁定范围继续集成验证 |

状态、特性、携带物的完整效果，以及 Mega／Z 招式／极巨化／太晶化等特殊系统的获得路径和机制依赖，仍属于 **P3／P4 在 P5 前共同完成的工作**。当前已接入的数据和计数存储是其基础。原生钓鱼、图鉴、牧场及其他世界系统继续由上游处理；本批专项验证聚焦战斗控制、道具、捕捉和存储交叉处，其他场景随集成检查。

## 技术结果

| 检查 | 结果 |
| --- | --- |
| 构建与协议 | 两个 Mod、领域 SDK 与 TypeScript 构建通过；22 项核心运行时检查、2 组输入检查通过 |
| 属性与培养 | 实际伤害 17 → 28；原生属性提供者替换、双属性抗性、免疫、小额生命换算及快照独立性通过 |
| 配招与提交 | 准备期取消／换招／PP 耗尽保持资源；成功提交扣一次，其他资源写入失败可回滚；玩家与 AI 共用资源入口，旧请求及保留的写入句柄失效 |
| 原生恢复与存储 | 原生 PP 道具、PP 提升、治疗、学习／遗忘／回忆、换招顺序与 PP 保存重启通过 |
| 成长 | 野生击败只结算一次；学习装置、力量道具、EV 上限、升级亲密度、学招、普通及交换进化通过 |
| 特殊进化记录 | 招式提交一次记一次，取消不计；受伤按实际原生 HP 减量计入，倒下由原生重置；按物种／携带条件匹配的击败记录通过 |
| 成长持久化修复 | 原生条件文本经序列化规范化后，重新关联相同条件，避免击败进度被丢弃；NBT 往返及真实进程重启通过 |
| 隔离与重载 | 非法成长数值在写入前被拒绝，只隔离成长策略；重新加载后恢复；旧事件无法继续写入 |
| 原生操作 | 道具实际处理、形态／属性更新、PC、交换与所属变化、骑乘／休息／进化交接、自由活动原生跟随通过 |
| 特殊球 | 原生倍率入口和倍率应用使用脚本结果；世界时间改变快速／计时球效果；等级、异性同种、是否交战以及不同玩家的条件隔离通过 |
| 核心独立 | 无 Cobblemon 的专服：投射、碰撞、取消、离场、异常隔离及重载通过 |
| 相关回归 | 本轮 P1 成长与保存、P2 输入／移动／捕捉及捕获后保存重启通过 |

上表为隐藏专服或后台构建结果。合并人工试玩已通过，具体观察见下节。当前四个原生招式是基础接入样例，完整机制、AI 与表现由 P4 扩展，P5 制作有充分广度的代表性正式内容。

## 人工验收与 P4 接续

用户确认配招／PP、成长、进化、道具、PC 和保存重入等清单项目正常；客户端日志记录了保存完成与正常退出。另记录两项样机行为：

- **移动速度：** 自由活动恢复原生跟随，用户观察到它与测试 AI 的移动速度不同。当前测试跟随调用原生导航时使用固定倍率，尚未复用原生跟随的速度策略。P4 衔接原生移动能力、培养及效果修正，由脚本表达行为策略。
- **多伙伴：** 当前持续 AI 会话跟随玩家所选队伍位置，切换后原伙伴恢复原生行为；生命、成长等原生适配仍作用于其他个体。P4 明确指挥选择、出战个体管理与持续意图的关系，同时出战范围按玩法设计确定。

样例技能、表现与 AI 策略应可整体移除或替换，作为 P4 的显式验收要求。当前选敌、追击和站位规则仍有部分位于适配 Kotlin，效果入口也有原型实现，需要在 P4 形成可替换的内容与通用协议。原生数据接入、生命周期、资源事务及其有效回归检查继续维护；旧样例的移除与新内容的替换能力应有实际运行结果。

实现入口：[领域快照](../../mods/cobblemon-world-combat/src/main/kotlin/dev/worldcombat/cobblemon/script/PokemonView.kt)、[配招与资源](../../content/mechanisms/native-loadout.ts)、[成长脚本](../../content/mechanisms/native-growth.ts)、[捕捉脚本](../../content/mechanisms/native-capture.ts)。稳定约定与下一阶段依赖见 [Cobblemon 接入](../architecture/cobblemon-integration.md)。

## 复查入口

按[构建说明](getting-started.md)准备 JDK 21 与内容依赖，再按改动选取检查：

```powershell
.\gradlew.bat --gradle-user-home .gradle-user -I tools/export-server-checks.gradle build assembleDist :world-combat-core:exportServerCheckLaunch :cobblemon-world-combat:exportServerCheckLaunch
python tools/check-server.py full --p3-native
python tools/check-server.py full --p3-moves
python tools/check-server.py full --p3-moves --restart
python tools/check-server.py full --p3-growth
python tools/check-server.py full --p3-growth --restart
python tools/check-server.py full --p3-operations
python tools/check-server.py core --scenario
```

相关回归命令为 `full --scenario`、`full --restart`、`full --p2-input`、`full --p2-movement`、`full --p2-capture`、`full --p2-capture --restart`。各增量结果和日志位于本地 `build/p3-*-checks/`，回归沿用 P1／P2 日志目录。

资源失败、脚本异常和非法成长配置检查包含预期错误日志，具体断言见[配招检查](../../mods/cobblemon-world-combat/src/test/kotlin/dev/worldcombat/cobblemon/checks/NativeMovesChecks.kt)、[成长检查](../../mods/cobblemon-world-combat/src/test/kotlin/dev/worldcombat/cobblemon/checks/NativeGrowthChecks.kt)和[原生操作检查](../../mods/cobblemon-world-combat/src/test/kotlin/dev/worldcombat/cobblemon/checks/NativeOperationsChecks.kt)。测试类与测试脚本仅用于专服检查，发行产物位于 `dist/`。

本次合并试玩使用快照 `build/p3-moves-launch/20260913-070620` 和独立存档副本，于 2026-09-13 按用户确认启动并完成人工验收。
