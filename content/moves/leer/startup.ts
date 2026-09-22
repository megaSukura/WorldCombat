// 瞪眼：被目光扫破架势的身份。只借共享身份 world_combat:status/guardbroken（与撕裂爪、铁尾、碎岩、
// 暗影之骨、万有引力等同一份「防御被破开」），行为（降低防御）写在本单元的 skill.ts 里，由
// NativeEffects.boost 落到宝可梦的原生防御等级或其他生物的护甲属性上。别的作者（例如三连箭的 AI）
// 已经按 guardbroken 读取，本招因此能直接接进破防一族。
StartupEvents.registry("mob_effect", event => event.create("world_combat:leer_spook")
    .harmful()
    .color(0x7FA6C4)
    .tag("world_combat:status/guardbroken")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
