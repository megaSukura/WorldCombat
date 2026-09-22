// Declares the Intimidate mark: a real attack debuff for every combatant, plus a Pokemon-only
// skill-haste cut that lengthens cooldowns.
StartupEvents.registry("mob_effect", event => event.create("world_combat:intimidate_mark")
    .harmful()
    .color(0xB03030)
    .modifyAttribute("minecraft:generic.attack_damage", "world_combat:intimidate_mark_attack", -0.3, "add_multiplied_total")
    .modifyAttribute("world_combat:skill_haste", "world_combat:intimidate_mark_haste", -40, "add_value")
    .effectTick((entity: any, amplifier: number) => { }));
