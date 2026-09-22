// 接棒：只借共享身份 `world_combat:status/baton_pass`，行为（递棒与连级）由招式自己写。
StartupEvents.registry("mob_effect", event => event.create("world_combat:baton_pass")
    .beneficial()
    .color(0x9FE6A0)
    .tag("world_combat:status/baton_pass")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
