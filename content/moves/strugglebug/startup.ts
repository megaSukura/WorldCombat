// 虫之抵抗的缠身载体：共享身份 world_combat:status/infested。
// 被虫群缠住的人身上趴着一层虫，走得慢：自带移动速度下降，行为只有「走得慢」这一条（identity_only）。
// 后续内容可以按这个身份消费「缠身」。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:infested")
    .harmful()
    .color(0x9FB13A)
    .tag("world_combat:status/infested")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:infested_speed", -0.3, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:infested_flying", -0.3, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
