// 薄雾场地的护场载体：一个真实有益状态效果，借共享身份 world_combat:status/mistyterrain，
// 只借身份，行为（异常门禁、龙伤减半、净化）写在本单元的 rules.ts。
StartupEvents.registry("mob_effect", event => event.create("world_combat:mistyterrain_ground")
    .beneficial()
    .color(0xBFE3EF)
    .tag("world_combat:status/mistyterrain")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
