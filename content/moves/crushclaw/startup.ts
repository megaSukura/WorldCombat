// 撕裂爪的破防载体：共享身份 world_combat:status/guardbroken，行为（降防与画面）全部由本单元写。
// 撕裂爪会主动消费这道身份：目标已经带着任何来源的破防标记时，撕开的缺口更深。
StartupEvents.registry("mob_effect", event => event.create("world_combat:crushclaw_rent")
    .harmful()
    .color(0x8A5A5A)
    .tag("world_combat:status/guardbroken")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
