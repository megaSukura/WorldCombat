// 重力井的贴地载体：一个真实状态效果，借共享身份 world_combat:status/gravity，
// 只借身份、行为全在 rules.ts（拽落、拔浮空、封锁凌空招式）。中立的类别，因为它对敌我都是同一件事。
StartupEvents.registry("mob_effect", event => event.create("world_combat:gravity_well")
    .category("neutral")
    .color(0x9B8FC2)
    .tag("world_combat:status/gravity")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
