// 毒丝：被毒丝缠过的身份。只借共享身份 world_combat:status/laced，行为（中毒、减速、拽近或钉住）
// 写在本单元的 skill.ts 里——中毒走共享默认效果，速度走 NativeEffects.boost，位移走 world.displace。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:toxic_thread_laced")
    .harmful()
    .color(0x8E44AD)
    .tag("world_combat:status/laced")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
