// 黏黏网：被网黏住的共享身份 world_combat:status/stickyweb。只借身份，行为写在本单元 skill.ts 里；
// 这里额外把移动与飞行速度压下去，让任何战斗者（含宝可梦、原版生物、玩家）站在网里都发沉。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:stickywebbed")
    .harmful()
    .color(0xE8DC9A)
    .tag("world_combat:status/stickyweb")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:stickywebbed_speed", -0.3, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:stickywebbed_flying", -0.3, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
