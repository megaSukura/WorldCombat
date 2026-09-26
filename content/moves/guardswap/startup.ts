// Visible carrier for the owned swap layers; removing it releases only this exchange.
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:guardswap_window").category("neutral").color(0x6FA8C8)
        .tag("world_combat:status/guardswap").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
