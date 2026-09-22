// Declares the grave-bandage state; the server rules seal a Pokemon attacker's ability on top.
StartupEvents.registry("mob_effect", event => event.create("world_combat:mummy_wrap")
    .harmful()
    .color(0xD8CBA0)
    .modifyAttribute("minecraft:generic.attack_damage", "world_combat:mummy_wrap", -0.2, "add_multiplied_total")
    .modifyAttribute("world_combat:healing_received", "world_combat:mummy_wrap", -50, "add_value")
    .effectTick((entity: any, amplifier: number) => { }));
