// Declares the armored brace that follows a blunted heavy hit. Server behavior lives in rules.ts.
StartupEvents.registry("mob_effect", event => event.create("world_combat:battlearmor_brace")
    .beneficial()
    .color(0x8FA8C8)
    .modifyAttribute("minecraft:generic.armor", "world_combat:battlearmor_brace_armor", 3, "add_value")
    .modifyAttribute("minecraft:generic.armor_toughness", "world_combat:battlearmor_brace_toughness", 2, "add_value")
    .effectTick((entity: any, amplifier: number) => { }));
