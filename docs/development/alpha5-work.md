# Alpha 5：共同根因修复

本版从逐招反馈追查全部 756 招的同型调用，修复有具体源码依据的路径，保留合法三维表现、专项净化、具有实际收益的闲时行为及明确设计为持久的强化。AI 和数值按招式分别处理。

职责继续按现有层次划分：Java 提供原版伤害与效果事实、最终冷却查询、通用粒子形状和生命周期能力；共享脚本解释伤害、净化、能力贡献及冷却；具体招式定义用途、平衡、AI 和表现。

## 实现入口

- [原版伤害语义](../../content/mechanisms/damage-semantics.ts)、[状态与净化](../../content/mechanisms/combat-status.ts)：原版来源事实、效果类别和共享行为入口。
- [能力贡献](../../content/mechanisms/native-effects.ts)、[临时层](../../content/mechanisms/native-modifiers.ts)：有效等级、逐层反转、转移与所有权交接。
- [最终冷却](../../content/mechanisms/action-cooldowns.ts)、[提交事务](../../mods/world-combat-core/src/main/java/dev/worldcombat/core/runtime/ActionRuntime.java)：原始冷却在提交时只结算一次；自定义修饰通过共享贡献表同时影响执行与说明。
- [伤害收尾](../../content/mechanisms/living-actions.ts)、[几何渲染](../../mods/world-combat-core/src/main/java/dev/worldcombat/core/client/particles/Shapes.java)：致死后的独立后续与水平扇区约定。
- [牧场运行](../../mods/cobblemon-world-combat/src/main/kotlin/dev/worldcombat/cobblemon/control/PastureControl.kt)：区块模拟期间的独立行为与原生存储生命周期。

## 验证范围

集成者统一执行类型、真实脚本注册、共享规则、Java 运行时和粒子检查，并在隐藏专服验证原生属性与状态、指令和关键命中边界。单元作者执行各自源码与接口检查；自动结果只代表实际断言的技术事实。

玩家包使用实际发行 jar 和正式脚本启动独立 NeoForge 专服，源码与玩家包同版发布。平衡、范围观感与操作体验保留后续游玩反馈空间；新增检查夹具用于工程验证。
