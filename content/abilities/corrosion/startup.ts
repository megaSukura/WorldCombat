// Declares the acid that eats armor and chips health. Server behavior lives in rules.ts.
StartupEvents.registry("mob_effect", event => event.create("world_combat:corrosion_acid")
    .harmful()
    .color(0x8FBF3F)
    .modifyAttribute("minecraft:generic.armor", "world_combat:corrosion_acid_armor", -4, "add_value")
    .modifyAttribute("minecraft:generic.armor_toughness", "world_combat:corrosion_acid_toughness", -2, "add_value")
    .effectTick((entity: any, amplifier: number) => { }));
