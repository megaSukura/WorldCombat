// Declares the perish countdown; its expiry is settled by server rules.
StartupEvents.registry("mob_effect", event => event.create("world_combat:perish_body")
    .harmful()
    .color(0x4B3A6B)
    .effectTick((entity: any, amplifier: number) => { }));
