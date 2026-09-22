// 魅惑之声的魅惑载体：共享身份 world_combat:status/charmed，行为（降攻、所见画面）全部由本单元写。
// 消费方可用 CombatStatus.has(world, actor, "charmed") 按身份读取。
StartupEvents.registry("mob_effect", event => event.create("world_combat:disarming_charm")
    .harmful()
    .color(0xF2A0C8)
    .tag("world_combat:status/charmed")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
