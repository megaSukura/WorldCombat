// Declares the searing state melee attackers receive; server behavior lives in rules.ts.
// It carries the shared burn identity `world_combat:status/burn`, so any consumer asking for "burn"
// sees it whichever unit produced it. `identity_only` keeps this unit's own chip behavior (the
// shared default burn damage does not run on it); identity alone does not create a Pokemon's native
// status. The Pokemon layer is the separate shared-default roll in rules.ts.
StartupEvents.registry("mob_effect", event => event.create("world_combat:flamebody_sear")
    .harmful()
    .color(0xFF7A18)
    .tag("world_combat:status/burn")
    .tag("world_combat:status/identity_only")
    // A non-null callback keeps the native effect clock running, which raises world_combat:mob_effect_tick.
    .effectTick((entity: any, amplifier: number) => { }));
