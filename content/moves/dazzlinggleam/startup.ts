// 魔法闪耀的目眩载体：共享身份 world_combat:status/dazzled。
// 被强光闪花眼的人脚下发虚：自带移动速度下降，行为本身只有「走得慢」这一条（identity_only）。
// 后续内容可以按这个身份消费「眼花」。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:dazzled")
    .harmful()
    .color(0xFFD9F2)
    .tag("world_combat:status/dazzled")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:dazzled_speed", -0.35, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:dazzled_flying", -0.35, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
