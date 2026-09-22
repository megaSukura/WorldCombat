// 浊流的泥水载体。
//
// `world_combat:muddywater_murk` 带共享身份 `world_combat:status/murky`（本单元发明：被泥水糊到）与家族的
// 伞身份 `world_combat:status/aim_impaired`（和闪光、泼沙、烟幕同一族：打不准），别的作者以后可用
// `CombatStatus.has(world, actor, "murky")` 或 `"aim_impaired"` 消费它。不镜像成 Cobblemon 原生异常。
// 原生「有时降低命中」的落点：MobEffect 让任何战斗者攻击变弱（贴在效果上的属性修饰），宝可梦那一层再由
// skill.ts 用 NativeEffects.boost 下降原生命中等级。启动脚本不引用服务端库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:muddywater_murk")
    .harmful()
    .color(0x6B5A3E)
    .tag("world_combat:status/murky")
    .tag("world_combat:status/aim_impaired")
    .modifyAttribute("minecraft:generic.attack_damage", "world_combat:muddywater_murk_attack", -0.15, "add_multiplied_total")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
