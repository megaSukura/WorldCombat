// 颠倒的印记：借共享身份 world_combat:status/inverted（别的单元可据此判断「刚被翻过面」）。
// 行为由本单元写：这只是一件「刚被颠倒过」的短期标记，增幅等级记翻过的项数；不动属性、不逐刻做事。
// identity_only：只借身份。
StartupEvents.registry("mob_effect", event => event.create("world_combat:topsy_turvy")
    .harmful()
    .color(0xBFE3FF)
    .tag("world_combat:status/inverted")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
