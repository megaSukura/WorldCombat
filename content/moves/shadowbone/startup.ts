// 暗影之骨的破防载体：共享身份 world_combat:status/guardbroken，行为（降防与画面）全部由本单元写。
// 与碎岩的缺口、铁尾的凹陷、撕裂爪的撕口共用同一个身份。
StartupEvents.registry("mob_effect", event => event.create("world_combat:shadowbone_spooked")
    .harmful()
    .color(0x6A5A8A)
    .tag("world_combat:status/guardbroken")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
