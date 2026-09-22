// 暗黑爆破的黑暗载体。
//
// `world_combat:nightdaze_shroud` 带共享身份 `world_combat:status/shrouded`（本单元发明：被黑暗笼罩、看不见）
// 与家族的伞身份 `world_combat:status/aim_impaired`（和闪光、泼沙、烟幕、浊流、镜光同一族：打不准），
// 别的作者以后可用 `CombatStatus.has(world, actor, "shrouded")` 或 `"aim_impaired"` 消费它。不镜像成
// Cobblemon 原生异常。原生「有时降低命中」的落点：MobEffect 让任何战斗者攻击变弱（贴在效果上的属性修饰），
// 宝可梦那一层再由 skill.ts 用 NativeEffects.boost 下降原生命中等级。启动脚本不引用服务端库。
StartupEvents.registry("mob_effect", event => event.create("world_combat:nightdaze_shroud")
    .harmful()
    .color(0x2A2340)
    .tag("world_combat:status/shrouded")
    .tag("world_combat:status/aim_impaired")
    .modifyAttribute("minecraft:generic.attack_damage", "world_combat:nightdaze_shroud_attack", -0.18, "add_multiplied_total")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
