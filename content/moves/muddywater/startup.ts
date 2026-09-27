// 浊流的泥水载体。
//
// `world_combat:muddywater_murk` 带共享身份 `world_combat:status/murky`（本单元发明：被泥水糊到）与家族的
// 伞身份 `world_combat:status/aim_impaired`（和闪光、泼沙、烟幕同一族：打不准），别的作者以后可用
// `CombatStatus.has(world, actor, "murky")` 或 `"aim_impaired"` 消费它。不镜像成 Cobblemon 原生异常。
// 命中下降的落点：skill.ts 用 NativeEffects.boost 落真实命中等级；这个效果作共享身份确认，不携带属性修饰。
StartupEvents.registry("mob_effect", event => event.create("world_combat:muddywater_murk")
    .harmful()
    .color(0x6B5A3E)
    .tag("world_combat:status/murky")
    .tag("world_combat:status/aim_impaired")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
