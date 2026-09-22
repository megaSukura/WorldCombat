// 鬼面：被吓住的身份。只借共享身份 world_combat:status/feared，行为（大幅下降速度、逼退、僵住）
// 写在本单元的 skill.ts 里，由 NativeEffects.boost 与 world.displace 落到所有战斗者共有的载体上。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:scary_face_terror")
    .harmful()
    .color(0x5B2A86)
    .tag("world_combat:status/feared")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
