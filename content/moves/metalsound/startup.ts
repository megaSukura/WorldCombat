// 金属音：被刮擦磨住的身份。只借共享身份 world_combat:status/grating，行为（大幅下降特防、回响很久）
// 写在本单元的 skill.ts 里，由 NativeEffects.boost 落到宝可梦的原生特防等级或其他生物的护甲属性上。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:metal_sound_grating")
    .harmful()
    .color(0xA8A24C)
    .tag("world_combat:status/grating")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
