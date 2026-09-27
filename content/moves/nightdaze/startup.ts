// 本招的原生状态载体；临时能力变化在服务端脚本中与它同生共灭。
StartupEvents.registry("mob_effect", event => event.create("world_combat:nightdaze_shroud")
    .harmful()
    .color(0x2A2340)
    .tag("world_combat:status/shrouded")
    .tag("world_combat:status/aim_impaired")
    .modifyAttribute("minecraft:generic.attack_damage", "world_combat:nightdaze_shroud_attack", -0.18, "add_multiplied_total")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
