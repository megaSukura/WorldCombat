// 雷鸣蹴击的破防载体：共享身份 world_combat:status/guardbroken，与撕裂爪/铁尾/暗影之骨/碎岩同一身份，
// 行为（降防与画面）全部由本单元写；别的破防招可以 CombatStatus.has(world, actor, "guardbroken") 接着消费。
StartupEvents.registry("mob_effect", event => event.create("world_combat:thunderouskick_guard")
    .harmful()
    .color(0xE8D24A)
    .tag("world_combat:status/guardbroken")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
