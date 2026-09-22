// 愤怒的怒火载体：借共享身份 world_combat:status/rage，行为全由本单元写（skill.ts 的挨打涨档、出手熄火、守炉火光）。
// 对宝可梦、原版生物、玩家是同一个状态效果：物品栏可见、/effect 可用。
StartupEvents.registry("mob_effect", event => event.create("world_combat:rage_stance")
    .beneficial()
    .color(0xB23A2E)
    .tag("world_combat:status/rage")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟继续发出 world_combat:mob_effect_tick；行为不在这里。
    .effectTick((entity: any, amplifier: number) => { }));
