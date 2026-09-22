// 苹果酸的发酵载体：共享身份 world_combat:status/sour，行为（叠酸与画面）全部由本单元写；
// 别的作者以后可以 CombatStatus.has(world, actor, "sour") 接着消费这层发酵。
StartupEvents.registry("mob_effect", event => event.create("world_combat:appleacid_sour")
    .harmful()
    .color(0x9EC44A)
    .tag("world_combat:status/sour")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
