// Declares the shared rhythm and the distracted mesmer. Server behavior lives in rules.ts.
StartupEvents.registry("mob_effect", event => {
    event.create("world_combat:dancer_rhythm")
        .beneficial()
        .color(0xF070B0)
        .modifyAttribute("minecraft:generic.movement_speed", "world_combat:dancer_rhythm_speed", 0.2, "add_multiplied_total")
        .modifyAttribute("minecraft:generic.attack_damage", "world_combat:dancer_rhythm_attack", 0.1, "add_multiplied_total")
        .effectTick((entity: any, amplifier: number) => { });
    event.create("world_combat:dancer_mesmer")
        .harmful()
        .color(0x9A5FD0)
        .modifyAttribute("minecraft:generic.attack_damage", "world_combat:dancer_mesmer_attack", -0.2, "add_multiplied_total")
        .effectTick((entity: any, amplifier: number) => { });
});
