// 圆瞳：被一双圆眼睛盯得下不去手。只借共享身份 world_combat:status/charmed（与叫声、撒娇同一份
// 「被可爱的东西卸下战意」），行为（降低攻击）写在本单元 skill.ts 里，由 NativeEffects.boost 落到
// 宝可梦的原生攻击等级或其他生物的攻击属性上，别的作者以后可以用同一个 tag 消费「被圆瞳看软」。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:babydoll_eyes")
    .harmful()
    .color(0xF7A8C4)
    .tag("world_combat:status/charmed")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
