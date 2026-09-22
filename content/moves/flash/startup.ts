// 闪光的晃眼。一个真实的 harmful MobEffect 让宝可梦、原版生物与玩家同样「打不准」：攻击力下降，
// 落点跟着力道一起变轻。它带共享身份 world_combat:status/dazzled，并挂上家族的伞身份
// world_combat:status/aim_impaired，别的单元可以直接消费（CombatStatus.has(world, actor, "dazzled") /
// "aim_impaired"）。宝可梦那一层另由 NativeEffects.boost 下降原生命中等级。启动脚本不引用服务端库。
StartupEvents.registry("mob_effect", event => event.create("world_combat:flash_dazzled")
    .harmful()
    .color(0xFFE9A0)
    .tag("world_combat:status/dazzled")
    .tag("world_combat:status/aim_impaired")
    .modifyAttribute("minecraft:generic.attack_damage", "world_combat:flash_dazzled_attack", -0.18, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
