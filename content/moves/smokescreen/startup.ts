// 烟幕的呛眼。一个真实的 harmful MobEffect 让宝可梦、原版生物与玩家同样「看不清、打不准」：攻击力下降。
// 它带共享身份 world_combat:status/smoked，并挂上家族的伞身份 world_combat:status/aim_impaired。
// 宝可梦那一层另由 NativeEffects.boost 下降原生命中等级。启动脚本不引用服务端库。
StartupEvents.registry("mob_effect", event => event.create("world_combat:smoke_obscured")
    .harmful()
    .color(0x6E6E78)
    .tag("world_combat:status/smoked")
    .tag("world_combat:status/aim_impaired")
    .modifyAttribute("minecraft:generic.attack_damage", "world_combat:smoke_obscured_attack", -0.2, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
