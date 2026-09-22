// 哈欠的睡意载体：一个真实的有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/yawn，只借身份（identity_only）、不借共享行为——睡意到点转成睡眠的那一步写在
// 本单元 skill.ts 的 world_combat:mob_effect_removed 里。启动脚本不引用服务端共享库。
StartupEvents.registry("mob_effect", event => event.create("world_combat:yawn_drowsy")
    .harmful()
    .color(0xD9C24A)
    .tag("world_combat:status/yawn")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
