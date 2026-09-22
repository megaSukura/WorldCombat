// 捕兽夹：被夹齿咬住的身份。借共享身份 world_combat:status/partiallytrapped（原生 volatile），
// 行为（无法移动）由这里的移动归零与 skill.ts 的导航监听共同完成；咬合与每跳伤害在 skill.ts 的持久效果里。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:snared_jaw")
    .harmful()
    .color(0xB9C7A6)
    .tag("world_combat:status/partiallytrapped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:snared_jaw_speed", -1, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:snared_jaw_flying", -1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
