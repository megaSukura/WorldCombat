// 铁尾的破防载体：共享身份 world_combat:status/guardbroken，行为（降防与画面）全部由本单元写。
// 与碎岩的缺口、撕裂爪的撕口、暗影之骨的慑防共用同一个身份，任何内容都能按身份读取。
StartupEvents.registry("mob_effect", event => event.create("world_combat:irontail_dented")
    .harmful()
    .color(0x8FA8B8)
    .tag("world_combat:status/guardbroken")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
