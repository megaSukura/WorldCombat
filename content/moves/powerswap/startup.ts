// Visible carrier for the owned swap layers; removing it releases only this exchange.
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:powerswap_window").category("neutral").color(0xFF9A4E)
        .tag("world_combat:status/powerswap").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
