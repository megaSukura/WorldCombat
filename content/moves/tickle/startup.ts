// 挠痒：笑到站不稳的身份。只借共享身份 world_combat:status/ticklish，行为（下降攻击与防御等级）写在本
// 单元的 skill.ts 里，由 NativeEffects.boost 落到宝可梦的原生等级或其他生物的攻击与护甲属性上，别的作者
// 以后可以用同一个 tag 消费「痒意」。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:ticklish_fit")
    .harmful()
    .color(0xF2C94C)
    .tag("world_combat:status/ticklish")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
