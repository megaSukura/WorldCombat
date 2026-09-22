// 棉孢子：被棉絮黏住的身份。只借共享身份 world_combat:status/cottoned，行为（大幅下降速度）写在本单元
// 的 skill.ts 里，由 NativeEffects.boost 落到宝可梦的原生速度等级或其他生物的移动速度属性上。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:cotton_clung")
    .harmful()
    .color(0xF6F3EA)
    .tag("world_combat:status/cottoned")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
