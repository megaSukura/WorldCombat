// 抛下狠话：只借共享身份 `world_combat:status/parting_shot`，削级与退步由招式自己写。
StartupEvents.registry("mob_effect", event => event.create("world_combat:parting_shot")
    .harmful()
    .color(0x6A3FA0)
    .tag("world_combat:status/parting_shot")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
