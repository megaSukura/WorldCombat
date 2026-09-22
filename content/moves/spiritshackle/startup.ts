// 缝影的钉住载体：共享身份 world_combat:status/trapped（借身份，行为由本单元写：移动归零）。
// 缝影命中时给目标挂上它，别的招式就可以用 CombatStatus.has(world, actor, "trapped") 消费「被缝住、逃不掉」这件事。
// identity_only：只借身份；移动归零由属性修饰与 skill.ts 的导航监听共同完成。
StartupEvents.registry("mob_effect", event => event.create("world_combat:spiritshackle_pinned")
    .harmful()
    .color(0x2E2440)
    .tag("world_combat:status/trapped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:spiritshackle_speed", -1, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:spiritshackle_flying", -1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
