// 水炮的湿透载体。
//
// `world_combat:hydropump_soaked` 带共享身份 `world_combat:status/soaked`，与泼冷水、水流尾、加农水炮
// 等的湿身是同一件事：消费方用 `CombatStatus.has(world, actor, "soaked")` 读到的是同一个身份
// （例如加农水炮对湿透目标有加成）。带 `world_combat:status/identity_only`：只借身份，
// 行为只有一处——湿透的个体移动稍慢，随效果到期一起消失。不镜像成 Cobblemon 原生异常。
StartupEvents.registry("mob_effect", event => event.create("world_combat:hydropump_soaked")
    .harmful()
    .color(0x2C86C8)
    .tag("world_combat:status/soaked")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:hydropump_soaked", -0.12, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:hydropump_soaked", -0.12, "add_multiplied_total")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
