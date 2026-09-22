// 背水一战的立誓载体：借共享身份 world_combat:status/noretreat 与 world_combat:status/trapped。
// 行为由本单元写：移动与飞行速度归零，导航速度再由 skill.ts 的监听压到零；立誓期满或被清除时精确移除。
// identity_only：只借身份；宝可梦身上不再另加原生异常——它是一件「此刻站着不退」的事，不是伤病。
StartupEvents.registry("mob_effect", event => event.create("world_combat:no_retreat")
    .harmful()
    .color(0xE0B040)
    .tag("world_combat:status/noretreat")
    .tag("world_combat:status/trapped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:no_retreat_speed", -1, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:no_retreat_flying", -1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
