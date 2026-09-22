// 电网：被网缠住的共享身份 world_combat:status/netted。只借身份，行为写在本单元 skill.ts 里；
// 这里额外把移动速度压到接近零，让非宝可梦战斗者在网里走不动，宝可梦则靠 rooted 与原生速度等级。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:electrowebbed")
    .harmful()
    .color(0xC7EEFF)
    .tag("world_combat:status/netted")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:electrowebbed_speed", -1, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:electrowebbed_flying", -1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
