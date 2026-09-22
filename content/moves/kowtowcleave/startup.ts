// 仆刀的空门载体：共享身份 world_combat:status/dropguard，行为（降防、加成、画面）全部由本单元写。
// 消费方可用 CombatStatus.has(world, actor, "dropguard") 按身份读取；别的招式也能利用这道空门。
StartupEvents.registry("mob_effect", event => event.create("world_combat:kowtow_guard")
    .harmful()
    .color(0x6A4A8A)
    .tag("world_combat:status/dropguard")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
