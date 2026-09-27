// 清除浓雾留下的「破绽」：一个真实的有害 MobEffect，宝可梦、原版生物与玩家是同一个身份
// world_combat:status/defogged。真正的削弱写在 skill.ts：闪避下降以 NativeEffects.boostWindow(evasion)
// 挂在这份载体上，载体在多久就降多久，到期/被清除时由共享等级窗口原样收回。启动脚本不引用服务端库。
StartupEvents.registry("mob_effect", event => event.create("world_combat:defog_exposed")
    .harmful()
    .color(0xBFE4E8)
    .tag("world_combat:status/defogged")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
