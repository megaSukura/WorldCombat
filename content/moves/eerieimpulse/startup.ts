// 怪异电波：被扰乱的身份。只借共享身份 world_combat:status/jammed，行为（大幅下降特攻）
// 写在本单元的 skill.ts 里，由 NativeEffects.boost 落到宝可梦的原生特攻等级或其他生物的攻击属性上。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:eerie_impulse_jammed")
    .harmful()
    .color(0x9BD84A)
    .tag("world_combat:status/jammed")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
