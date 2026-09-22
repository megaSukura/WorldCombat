// Shared default carriers of the major statuses. Identity is the tag `world_combat:status/<name>`;
// behavior (immobility, paralysis failure, burn damage) lives in content/mechanisms/combat-status.ts.
StartupEvents.registry("mob_effect", event => {
    event.create("world_combat:burn").harmful().color(0xE2531B).tag("world_combat:status/burn")
        .modifyAttribute("minecraft:generic.attack_damage", "world_combat:burn_attack", -0.5, "add_multiplied_total")
        .effectTick((entity: any, amplifier: number) => { });
    event.create("world_combat:paralysis").harmful().color(0xE8C81E).tag("world_combat:status/paralysis")
        .modifyAttribute("minecraft:generic.movement_speed", "world_combat:paralysis_speed", -0.5, "add_multiplied_total")
        .effectTick((entity: any, amplifier: number) => { });
    event.create("world_combat:sleep").harmful().color(0x6D5BD0).tag("world_combat:status/sleep")
        .modifyAttribute("minecraft:generic.movement_speed", "world_combat:sleep_speed", -1, "add_multiplied_total")
        .modifyAttribute("minecraft:generic.flying_speed", "world_combat:sleep_flying", -1, "add_multiplied_total")
        .effectTick((entity: any, amplifier: number) => { });
    event.create("world_combat:frozen").harmful().color(0x7FD7F0).tag("world_combat:status/frozen")
        .modifyAttribute("minecraft:generic.movement_speed", "world_combat:frozen_speed", -1, "add_multiplied_total")
        .modifyAttribute("minecraft:generic.flying_speed", "world_combat:frozen_flying", -1, "add_multiplied_total")
        .effectTick((entity: any, amplifier: number) => { });
    // Shared volatile carriers. A move that wants its own icon still declares a tagged carrier; these defaults let
    // CombatStatus.inflict and the secondary-status route use the identity without a per-unit effect.
    event.create("world_combat:confusion").harmful().color(0xB15CE0).tag("world_combat:status/confusion")
        .effectTick((entity: any, amplifier: number) => { });
    event.create("world_combat:flinch").harmful().color(0xF6D36B).tag("world_combat:status/flinch")
        .effectTick((entity: any, amplifier: number) => { });
});
