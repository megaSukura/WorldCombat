// 妖精之锁的封印载体：借共享身份 world_combat:status/trapped 与 world_combat:status/fairy_locked。
// 行为由本单元写：移动与飞行速度归零，导航速度再由 skill.ts 的监听压到零；光栅落下时套上、散开时精确移除。
// identity_only：只借身份；宝可梦身上不再另加原生异常——它是一件「此刻被关住」的事，不是中毒那样的伤病。
StartupEvents.registry("mob_effect", event => event.create("world_combat:fairy_lock")
    .harmful()
    .color(0xF7A8D8)
    .tag("world_combat:status/trapped")
    .tag("world_combat:status/fairy_locked")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:fairy_lock_speed", -1, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:fairy_lock_flying", -1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
