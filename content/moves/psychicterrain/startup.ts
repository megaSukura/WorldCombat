// 精神场地的护场载体：一个真实有益状态效果，借共享身份 world_combat:status/psychicterrain，
// 只借身份，行为（超能增幅、先制封锁）写在本单元的 rules.ts。
StartupEvents.registry("mob_effect", event => event.create("world_combat:psychicterrain_ground")
    .beneficial()
    .color(0xD86FC0)
    .tag("world_combat:status/psychicterrain")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
