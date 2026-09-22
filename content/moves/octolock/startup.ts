// 蛸固的缠绕载体：借共享身份 world_combat:status/octolock 与 world_combat:status/trapped。
// 行为由本单元写：移动与飞行速度归零，导航速度再由 skill.ts 的监听压到零；触手松开或标记被清时精确移除。
// identity_only：只借身份；宝可梦身上不再另加原生异常——它是一件「被缠住」的事，双防下降由 skill.ts 走原生等级。
StartupEvents.registry("mob_effect", event => event.create("world_combat:octolock_bound")
    .harmful()
    .color(0x8E4FA8)
    .tag("world_combat:status/octolock")
    .tag("world_combat:status/trapped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:octolock_bound_speed", -1, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:octolock_bound_flying", -1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
