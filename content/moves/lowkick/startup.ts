// 踢倒的绊倒载体：借共享身份 world_combat:status/tripped，行为（降速、绊步）另由 skill.ts 的 rooted 与等级下降补齐。
StartupEvents.registry("mob_effect", event => event.create("world_combat:lowkick_stagger")
    .harmful()
    .color(0xC97B4A)
    .tag("world_combat:status/tripped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:lowkick_stagger", -0.5, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
