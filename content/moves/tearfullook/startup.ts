// 泪眼汪汪：丧失斗志的身份。只借共享身份 world_combat:status/disheartened，行为（同时下降攻击与特攻等级）
// 写在本单元的 skill.ts 里，由 NativeEffects.boost 落到宝可梦的原生等级或其他生物的攻击属性上，别的作者
// 以后可以用同一个 tag 消费「丧失斗志」。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:disheartened_tears")
    .harmful()
    .color(0x7FB3E0)
    .tag("world_combat:status/disheartened")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
