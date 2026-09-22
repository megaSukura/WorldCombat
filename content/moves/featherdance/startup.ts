// 羽毛舞：被羽绒覆身的身份。只借共享身份 world_combat:status/downy，行为（大幅下降攻击）写在本单元
// 的 skill.ts 里，由 NativeEffects.boost 落到宝可梦的原生攻击等级或其他生物的攻击属性上。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:downy_coat")
    .harmful()
    .color(0xF6F3EA)
    .tag("world_combat:status/downy")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
