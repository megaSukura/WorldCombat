# 原生 NPC 即时挑战

原生 NPC 对话、`BattleBuilder.pvn` 及一名玩家对一名 `NPCBattleActor` 的注册入口进入即时挑战。NPC 沿用自己的原生队伍、名额、随机顺序和战后治疗配置；成功返回原生挑战对象，真正决出胜负后执行原生胜负脚本、命令奖励和挑战冷却。

玩家在世界中自由操作。NPC 队伍全部倒下判玩家获胜；玩家死亡判落败；收回伙伴或伙伴全部倒下仍可继续亲自作战。离开挑战区域、断线、换维度、NPC 卸载或内容重载会中止挑战，回收 NPC 本场实体，不产生胜负奖励。

玩法入口是 [默认规则](../../content/behaviors/npc-challenges/rules.ts) 和 [可复用的队伍行为组合](../../content/library/companions/trainers.ts)。可按 NPC class 添加策略与目标选择贡献；各招式仍使用现有行为定义，属性、性格、特性和携带物沿用共享决策流程。Java 的 [原生桥](../../mods/cobblemon-world-combat/src/main/kotlin/dev/worldcombat/cobblemon/NativeNpcChallenges.kt) 负责原生身份、生命周期、操作权限及结算验证。

目前支持原生一对一训练家的单打、双打、三打名额，保留原生开场队伍人数验证。克隆队伍、临时调级、多训练家和额外 Showdown 规则会在修改队伍之前明确拒绝。复用上述原生接口的扩展可接入；独立训练家实体或另起战斗系统的扩展需要对应适配，不能据此视为所有道馆模组已兼容。

按[安装说明](../../release/INSTALL.md)更新两个 Mod 和脚本并完整重启实例。可使用已有可挑战 NPC；若需原生现成入口，在空地执行 `/spawnnpc cobblemon:ai_test 12`，右键交谈后选择 Battle。这个上游模板使用双打，玩家队伍需至少两只健康宝可梦；战斗中可自由派出、收回或亲自参战。该入口用于人工体验，不作为已验收的内容创作范本。

后台集成检查：`python tools/check-server.py full --npc-challenges --content build/content/profiles/play`。客户端对话、镜头及实际节奏由人工试玩确认。
