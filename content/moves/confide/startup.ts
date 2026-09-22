// 密语：失去集中力的身份。只借共享身份 world_combat:status/confided，行为（下降特攻等级）写在本单元
// 的 skill.ts 里，由 NativeEffects.boost 落到宝可梦的原生特攻等级或其他生物的攻击属性上，别的作者以后
// 可以用同一个 tag 消费「失神」。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:confided_whisper")
    .harmful()
    .color(0x8A7BD8)
    .tag("world_combat:status/confided")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
