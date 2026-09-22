// 碎岩的破防载体：共享身份 world_combat:status/guardbroken，行为（降防与画面）全部由本单元写。
// 别的招式（本族的撕裂爪、铁尾、暗影之骨，或将来任何内容）可用 CombatStatus.has(world, actor, "guardbroken")
// 按身份读取这道缺口；来源与本招无关。
StartupEvents.registry("mob_effect", event => event.create("world_combat:rocksmash_cracked")
    .harmful()
    .color(0xB07A4A)
    .tag("world_combat:status/guardbroken")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
