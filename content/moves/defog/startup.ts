// 清除浓雾留下的「破绽」：一个真实的有害 MobEffect，宝可梦、原版生物与玩家是同一个身份
// world_combat:status/defogged。真正的削弱写在 skill.ts：破防走 NativeEffects.boost(def)（对原版生物
// 落到护甲上），闪避下降走 NativeEffects.boost(evasion)（宝可梦原生等级）。启动脚本不引用服务端库。
StartupEvents.registry("mob_effect", event => event.create("world_combat:defog_exposed")
    .harmful()
    .color(0xBFE4E8)
    .tag("world_combat:status/defogged")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
