// 冲浪的湿身载体：一个真实的有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份。
// 带共享身份 `world_combat:status/soaked`（与水流尾、波动冲、水流裂破、求雨的湿身是同一件事，
// 别的单元用 `CombatStatus.has(world, actor, "soaked")` 读到的是同一个身份），
// 并带 `world_combat:status/identity_only`：只借身份，行为写在这里与消费方，不会镜像成 Cobblemon 原生异常。
// 行为只有一处：被浇透的个体移动稍慢，由原生属性修饰承担，随效果到期一起消失（与水流尾同一写法）。
StartupEvents.registry("mob_effect", event => event.create("world_combat:surf_soaked")
    .harmful()
    .color(0x3E8FCB)
    .tag("world_combat:status/soaked")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:surf_soaked", -0.10, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
