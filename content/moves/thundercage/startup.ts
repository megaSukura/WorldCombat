// 雷电囚笼的电场载体：借共享身份 world_combat:status/partiallytrapped（原生 volatile），
// 行为写在本单元 skill.ts 的绑定电笼里。笼子不靠定身，而是靠一圈带电栅栏：越界就被电弧推回并电击。
// 逐次电击、越界判定与笼柱画面由绑定效果按 2 刻一拍驱动。
StartupEvents.registry("mob_effect", event => event.create("world_combat:thundercage_grid")
    .harmful()
    .color(0xE8E24A)
    .tag("world_combat:status/partiallytrapped")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
