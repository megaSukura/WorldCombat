// 烦恼种子：一个真实有害 MobEffect，承载共享身份 world_combat:status/worryseed，
// 对宝可梦、原版生物、玩家是同一个东西（物品栏可见、/effect 可用、牛奶可解）。
// 它告诉玩家与对手「被种了、不能睡」，真正的不眠判定在 rules.ts 里按有效特性读，行为全由本单元写。
StartupEvents.registry("mob_effect", event => event.create("world_combat:worryseed")
    .harmful()
    .color(0x8FBF4A)
    .tag("world_combat:status/worryseed")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
