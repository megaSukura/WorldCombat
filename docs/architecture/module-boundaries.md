# 模块边界

项目交付两个 jar。核心提供通用行动、状态、世界操作与脚本能力，配合其声明的依赖运行；适配拥有 Cobblemon 个体、成长、伙伴指令和具体 UI 的领域语义，通过依赖声明连接核心与 Cobblemon。

构建与运行边界直接见[核心构建](../../mods/world-combat-core/build.gradle.kts)和[适配构建](../../mods/cobblemon-world-combat/build.gradle.kts)。两个项目分别配置客户端和专服运行目录，客户端入口使用加载侧标记。通用 KubeJS 依赖由核心配置；Kotlin 与 Cobblemon 依赖属于适配配置。

两个 Mod 保留 LDLib2 界面依赖；技能特效路线见[表现方案调整](../development/particle-presentation.md)。脚本职责划分与客户端／服务端加载隔离服务于维护和执行安全。Cobblemon 适配可按即时玩法需要，通过原生接口、Mixin、界面替换或新增机制深入修改上游行为，负责其兼容与生命周期。共享玩法和具体招式设计继续由脚本承担。

运行合同：客户端提供预览和意图；服务端验证并推进动作。Cobblemon 持有个体及成长的持久数据，核心持有通用动作实例，适配管理二者的绑定与结果转换。当前作者类型见[核心](../../sdk/core/index.d.ts)与[领域](../../sdk/cobblemon/index.d.ts)。P2 已接入快捷键与预览；P3 的原生数据快照属于领域 SDK，伤害组合属于内容脚本。

扩展性随内容持续检查：P3 验证原生能力接入时的模块边界，P4 用增量机制包完善通用协议，P5 及后续阶段验证机制组合与实际制作。具体阶段安排见[完整计划](../../cobblemon_world_combat_plan_v0.3.md#sec-15)。

资源遵循同一边界：[内容脚本](../../content/mechanisms/native-loadout.ts)选择招式绑定、用量与提交时机；[原生适配](../../mods/cobblemon-world-combat/src/main/kotlin/dev/worldcombat/cobblemon/script/NativeMoveResources.kt)验证招式身份并读写原生 PP；[核心事务](../../mods/world-combat-core/src/main/java/dev/worldcombat/core/runtime/CommitCost.java)统一预检、扣除与失败回滚。提交前取消不扣资源，提交成功后由动作保留已付成本，原生恢复沿用 Cobblemon。

成长与捕捉继续沿用此分工：[成长脚本](../../content/mechanisms/native-growth.ts)和[捕捉脚本](../../content/mechanisms/native-capture.ts)定义收益、条件与数值；领域适配提供原生快照、短期事件写入及存储接口。核心只增加通用的提交后通知，供领域记录已成功执行的动作。具体道具、招式、物种与原生进化条件由适配和内容层处理。
