// Declares Forewarn's mark: a real, curable movement debuff applied by the ability.
StartupEvents.registry("mob_effect", event => event.create("world_combat:forewarn_mark")
    .harmful()
    .color(0x7A5FBF)
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:forewarn_mark_slow", -0.15, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
