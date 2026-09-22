// 黑色目光的凝视载体：借共享身份 world_combat:status/trapped（别的单元可据此判断「被定住、逃不掉」）。
// 行为由本单元写：移动与飞行速度归零、导航速度再由 skill.ts 的监听压到零；术者一松劲、锁一断，状态就被精确移除。
// identity_only：只借身份；宝可梦身上不再另加原生异常——它是一件「此刻不能动」的事，不是中毒那样的伤病。
StartupEvents.registry("mob_effect", event => event.create("world_combat:meanlook_gaze")
    .harmful()
    .color(0x2A2140)
    .tag("world_combat:status/trapped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:meanlook_gaze_speed", -1, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:meanlook_gaze_flying", -1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
