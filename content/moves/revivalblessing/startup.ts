// 复生祈祷：只借共享身份 `world_combat:status/revival_blessing`，祈祷光柱与祝福由招式自己写。
StartupEvents.registry("mob_effect", event => event.create("world_combat:revival_blessing")
    .beneficial()
    .color(0xFFF2B0)
    .tag("world_combat:status/revival_blessing")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
