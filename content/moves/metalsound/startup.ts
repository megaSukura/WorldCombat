// 金属音：被刮擦磨住的身份。只借共享身份 world_combat:status/grating，行为（分几次刮掉特防、回响很久）
// 写在本单元的 skill.ts 里，由 NativeEffects.boostWindow 绑在这份载体上临时下降特防（对宝可梦落到原生特防等级，
// 对其他生物落到共享 spd 阶梯）；载体到期、被驱散或被替换时，这些临时降级一并收回。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:metal_sound_grating")
    .harmful()
    .color(0xA8A24C)
    .tag("world_combat:status/grating")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
