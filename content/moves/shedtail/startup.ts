// 断尾：只借共享身份 `world_combat:status/shed_tail`，行为（尾巴本身与牵引）由招式自己写。
StartupEvents.registry("mob_effect", event => event.create("world_combat:shed_tail")
    .beneficial()
    .color(0xB0705A)
    .tag("world_combat:status/shed_tail")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
