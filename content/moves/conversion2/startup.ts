// 纹理２的承载状态：重织出来的那层属性/抗性挂在它身上，随它到期或被清除一起收回。
// 它是给玩家看的持续图标（物品栏可见、/effect 可用）；真正的属性 replace 走共享 CombatTypes，减伤走 CombatCopies.resist。
StartupEvents.registry("mob_effect", event => event.create("world_combat:conversion2_type")
    .beneficial()
    .color(0x8FD8D8)
    .tag("world_combat:status/conversion2")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
