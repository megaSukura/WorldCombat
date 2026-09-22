// 龙锤的砸趴载体：共享身份 world_combat:status/knocked_down。
// 被砸实的目标趴伏一阵、走不动几步：自带移动速度大幅下降，行为本身只有「走不动」这一条（identity_only）。
// 后续内容可以按这个身份消费「被砸趴」。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:knocked_down")
    .harmful()
    .color(0x8A6BD0)
    .tag("world_combat:status/knocked_down")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:knocked_down_speed", -0.85, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:knocked_down_flying", -0.85, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
