// 紧咬不放：两个互锁身份。
// world_combat:jaw_locked  —— 被咬住的一方，借共享身份 world_combat:status/trapped；行为（无法移动）
//   由这里的移动属性归零与 skill.ts 的导航监听共同完成。
// world_combat:jaw_holding —— 正在咬住的一方，同样借 trapped；行为（无法移动）与上面一致，
//   施法者带着它时不能走开，直到任一方倒下或被外力拉开。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:jaw_locked")
    .harmful()
    .color(0x6E4A8C)
    .tag("world_combat:status/trapped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:jaw_locked_speed", -1, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:jaw_locked_flying", -1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));

StartupEvents.registry("mob_effect", event => event.create("world_combat:jaw_holding")
    .harmful()
    .color(0x9A7BFF)
    .tag("world_combat:status/trapped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:jaw_holding_speed", -1, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:jaw_holding_flying", -1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
