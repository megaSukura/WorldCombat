// 本招的原生状态载体；临时能力变化在服务端脚本中与它同生共灭。
StartupEvents.registry("mob_effect", event => event.create("world_combat:tar_coated")
    .harmful()
    .color(0x1E1A17)
    .tag("world_combat:status/tarshot")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:tar_coated_speed", -0.35, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:tar_coated_flying", -0.35, "add_multiplied_total")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
