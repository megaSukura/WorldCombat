// 本招的原生状态载体；临时能力变化在服务端脚本中与它同生共灭。
StartupEvents.registry("mob_effect", event => event.create("world_combat:lowkick_stagger")
    .harmful()
    .color(0xC97B4A)
    .tag("world_combat:status/tripped")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:lowkick_stagger", -0.5, "add_multiplied_total")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
