// 撒娇：被撒娇拖软的心软身份。只借共享身份 world_combat:status/charmed（魅惑之声已经用它标记
// 「被可爱的东西卸下战意」），行为（大幅降低攻击）写在本单元的 skill.ts 里，由 NativeEffects.boost
// 落到宝可梦的原生攻击等级或其他生物的攻击属性上，别的作者以后可以用同一个 tag 消费“被撒娇”。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:charm_heart")
    .harmful()
    .color(0xF28FB0)
    .tag("world_combat:status/charmed")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
