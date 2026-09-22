// Test fixture: a real MobEffect whose icon reuses a vanilla texture; no local PNG is shipped.
StartupEvents.registry("mob_effect", event => event.create("checks:visual_sample")
    .beneficial()
    .color(0x66CCFF)
    .effectTick((entity: any, amplifier: number) => { }));
