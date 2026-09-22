// 死缠烂打的虫群载体：借共享身份 world_combat:status/partiallytrapped（原生 volatile），
// 行为写在本单元 skill.ts 的绑定效果与监听里。movement_speed/flying_speed 归零实现「无法逃走」；
// 每段啃咬由绑定效果按 interval 触发，不在这里逐 tick 做。
StartupEvents.registry("mob_effect", event => event.create("world_combat:infestation_swarm")
    .harmful()
    .color(0x8FA83A)
    .tag("world_combat:status/partiallytrapped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:infestation_swarm_speed", -1, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:infestation_swarm_flying", -1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
