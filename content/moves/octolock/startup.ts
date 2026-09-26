// 蛸固的缠绕载体：借共享身份 world_combat:status/octolock 与 world_combat:status/trapped。
// 行为由本单元写：牵制是有界的减速（移动/飞行降速一半），不是钉死；触手松开、标记被牛奶清掉或 /effect clear
// 时精确移除，减速随之消失。identity_only：只借身份；宝可梦身上不再另加原生异常——双防下降由 skill.ts 走原生等级。
StartupEvents.registry("mob_effect", event => event.create("world_combat:octolock_bound")
    .harmful()
    .color(0x8E4FA8)
    .tag("world_combat:status/octolock")
    .tag("world_combat:status/trapped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:octolock_bound_speed", -0.5, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:octolock_bound_fly", -0.5, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
