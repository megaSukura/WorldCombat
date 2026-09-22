// 薄雾球的缠身载体：共享身份 world_combat:status/downcast。
// 被羽绒雾糊住的人走得慢：自带移动速度下降，行为只有「走得慢」这一条（identity_only）。
// 后续内容可以按这个身份消费「被雾糊住」。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:downcast")
    .harmful()
    .color(0xE9E4FF)
    .tag("world_combat:status/downcast")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:downcast_speed", -0.35, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:downcast_flying", -0.35, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
