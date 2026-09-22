// 流沙地狱的陷沙载体：借共享身份 world_combat:status/partiallytrapped（原生 volatile），
// 行为写在本单元 skill.ts 的绑定流沙坑与 navigate 监听里。移动/飞行速度归零实现「被流沙钉住」；
// 只对贴地目标生效——腾空（跳跃、飞行、被抬起、瞬移）即可脱身。逐次磨蚀与下陷由绑定效果驱动。
StartupEvents.registry("mob_effect", event => event.create("world_combat:sandtomb_grip")
    .harmful()
    .color(0xC9A76A)
    .tag("world_combat:status/partiallytrapped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:sandtomb_grip_speed", -1, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:sandtomb_grip_flying", -1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
