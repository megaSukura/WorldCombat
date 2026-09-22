// 缠绕的束缚载体：借共享身份 world_combat:status/trapped（别的单元可据此判断目标被缠住），
// 行为除了移动减速外，速度等级与短定身由 skill.ts 的 boost 与 rooted 补齐。
StartupEvents.registry("mob_effect", event => event.create("world_combat:constrict_bind")
    .harmful()
    .color(0x4E7A32)
    .tag("world_combat:status/trapped")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:constrict_bind", -0.3, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
