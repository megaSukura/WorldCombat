// 吐丝：被丝缠住的身份。只借共享身份 world_combat:status/silked，行为（大幅下降速度）写在本单元的
// skill.ts 里，由 NativeEffects.boost 落到宝可梦的原生速度等级或其他生物的移动速度属性上。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:string_bound")
    .harmful()
    .color(0xE6E2D6)
    .tag("world_combat:status/silked")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
