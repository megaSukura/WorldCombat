// 大声咆哮：被斥责的身份。只借共享身份 world_combat:status/snarled（「气势被骂下去」），
// 行为（特攻下降）由本单元的 skill.ts 用 NativeEffects.boost 落到宝可梦的原生特攻等级或其他生物的能力阶梯上，
// 别的作者以后可以用同一个 tag 消费「这货被骂软了没」。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:snarl_scolded")
    .harmful()
    .color(0x8A6BC8)
    .tag("world_combat:status/snarled")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
