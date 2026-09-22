// 欢乐时光的光环：一个真实的有益 MobEffect，宝可梦、原版生物与玩家是同一个身份
// world_combat:status/happyhour。收益行为写在 skill.ts：金色场地上每倒下一名非友方就落下真币。
// 它同时给 ready 校验用来避免重复施放。
StartupEvents.registry("mob_effect", event => event.create("world_combat:happyhour_banner")
    .beneficial()
    .color(0xFFD24A)
    .tag("world_combat:status/happyhour")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
