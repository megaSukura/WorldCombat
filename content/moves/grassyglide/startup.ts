// 青草滑梯的落点草皮载体：一个真实的有益 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/grassyterrain（与青草场地共用，别的单元可以只问「在不在青草场地上」）。
// identity_only 表示不借共享默认行为——草地的好处由共享的草地结算与各消费方读取，不在这里写。
// 图标复用原版再生。
StartupEvents.registry("mob_effect", event => event.create("world_combat:grassyglide_ground")
    .beneficial()
    .color(0x7CCB5A)
    .tag("world_combat:status/grassyterrain")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟继续发出 world_combat:mob_effect_tick；行为不在这里。
    .effectTick((entity: any, amplifier: number) => { }));
