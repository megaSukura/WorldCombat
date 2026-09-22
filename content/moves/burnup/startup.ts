// 燃尽的载体：一个真实有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/burned_out（别的单元可以只问「燃尽了没有」）。属性变化由本单元 rules.ts
// 用共享 NativeModifiers 的 types 层承担（与效果同寿命）；这里只给颜色与图标，不写逐刻行为。
// 图标复用原版「虚弱」，一眼读出「暂时不行了」。
StartupEvents.registry("mob_effect", event => event.create("world_combat:burnup_spent")
    .harmful()
    .color(0x8A4B2A)
    .tag("world_combat:status/burned_out")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
