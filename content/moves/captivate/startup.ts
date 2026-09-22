// 诱惑：被迷住的身份。只借共享身份 world_combat:status/captivated，行为（大幅下降特攻等级）写在本单元
// 的 skill.ts 里，由 NativeEffects.boost 落到宝可梦的原生特攻等级或其他生物的攻击属性上，别的作者以后
// 可以用同一个 tag 消费“被迷住”。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:captivate_gaze")
    .harmful()
    .color(0xF28FB0)
    .tag("world_combat:status/captivated")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
