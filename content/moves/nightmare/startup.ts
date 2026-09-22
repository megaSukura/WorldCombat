// 恶梦的载体：一个真实的有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/nightmare。只借身份（identity_only），逐段抽取与「把人按在睡眠里」的行为写在本单元
// skill.ts 的 world_combat:nightmare_bind 绑定效果里。启动脚本不引用服务端共享库。
StartupEvents.registry("mob_effect", event => event.create("world_combat:nightmare")
    .harmful()
    .color(0x4B2A6B)
    .tag("world_combat:status/nightmare")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
