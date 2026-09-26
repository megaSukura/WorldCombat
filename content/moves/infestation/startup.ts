// 虫群只携带附着身份；移动甩虫与伤害由有来源的绑定效果负责。
StartupEvents.registry("mob_effect", event => event.create("world_combat:infestation_swarm")
    .harmful().color(0x8FA83A).tag("world_combat:status/partiallytrapped").tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
