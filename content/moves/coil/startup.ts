// 一份短期盘劲身份；实际预约/消耗由伤害回执驱动。
StartupEvents.registry("mob_effect", event => event.create("world_combat:coil_brace")
    .beneficial().color(0x8A6FD8).tag("world_combat:status/coil").tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));