// 摇尾巴：被尾巴晃散架势的身份。只借共享身份 world_combat:status/guardbroken（与瞪眼、撕裂爪、铁尾、
// 碎岩、暗影之骨等同一份「防御被破开」），行为（降低防御）写在本单元的 skill.ts 里，由 NativeEffects.boost
// 落到宝可梦的原生防御等级或其他生物的护甲属性上。本招与瞪眼共用 identity，但形状不同：它是绕身一整圈。
StartupEvents.registry("mob_effect", event => event.create("world_combat:tailwhip_wobble")
    .harmful()
    .color(0xE0A060)
    .tag("world_combat:status/guardbroken")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
