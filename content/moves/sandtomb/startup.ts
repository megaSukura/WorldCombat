// 流沙地狱的陷沙身份：借共享身份 world_combat:status/partiallytrapped（原生 volatile）。
// 具体的逐步减速由每目标载体 world_combat:sandtomb_bond 的临时属性修饰表达（从轻到满、约 12 刻），
// 所以这里只保留身份与图标，不直接归零移动速度；行为写在本单元 skill.ts 的坑规则、载体与 navigate 监听里。
// 只对贴地目标生效——腾空（跳跃、飞行、被抬起、瞬移）即可脱身。
StartupEvents.registry("mob_effect", event => event.create("world_combat:sandtomb_grip")
    .harmful()
    .color(0xC9A76A)
    .tag("world_combat:status/partiallytrapped")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
