// 蛛网的裹身载体：借共享身份 world_combat:status/trapped（别的单元可据此判断「被缠住、逃不掉」）。
// 行为由本单元写：常规移动速度被压到 65%，导航速度再由 skill.ts 的监听按层数继续压（三层以上归零）。
// 层数记在增幅等级里；火会让 skill.ts 把这个状态精确移除。identity_only：只借身份。
StartupEvents.registry("mob_effect", event => event.create("world_combat:spiderweb_wrapped")
    .harmful()
    .color(0xE6E2D6)
    .tag("world_combat:status/trapped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:spiderweb_wrapped_speed", -0.35, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:spiderweb_wrapped_flying", -0.35, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
