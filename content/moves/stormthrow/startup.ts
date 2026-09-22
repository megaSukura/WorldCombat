// 山岚摔的摔翻载体：一个真实有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/stagger（别的单元可以只问「被摔翻没有」）。行为有两处：移动变慢由原生属性修饰承担，
// 「无法开始新动作」由 skill.ts 里 CombatStatus.actions 的门禁承担；identity_only 表示不借共享默认行为。
// 图标复用原版虚弱。
StartupEvents.registry("mob_effect", event => event.create("world_combat:stormthrow_stagger")
    .harmful()
    .color(0xC98B3A)
    .tag("world_combat:status/stagger")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:stormthrow_stagger", -0.5, "add_multiplied_total")
    // 非空回调让原生效果时钟继续发出 world_combat:mob_effect_tick；行为不在这里。
    .effectTick((entity: any, amplifier: number) => { }));
