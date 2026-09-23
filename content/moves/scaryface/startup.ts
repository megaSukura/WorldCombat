// 被吓住的图标与 skill.ts 创建的临时减速窗口共用一次生命周期。
StartupEvents.registry("mob_effect", event => event.create("world_combat:scary_face_terror")
    .harmful()
    .color(0x5B2A86)
    .tag("world_combat:status/feared")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
