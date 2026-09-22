// 指导：受教者身上的一段攻防窗口，承载共享身份 world_combat:status/coaching。
// 物攻与防御各用一份真实有益 MobEffect，效果等级各自记住这次实际抬到几级，窗口结束时照数收回。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:coaching_drill")
    .beneficial()
    .color(0xF2C15A)
    .tag("world_combat:status/coaching")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));

StartupEvents.registry("mob_effect", event => event.create("world_combat:coaching_stance")
    .beneficial()
    .color(0xE8C06A)
    .tag("world_combat:status/coaching")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
