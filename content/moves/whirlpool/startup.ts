// 潮旋的水流载体：借共享身份 world_combat:status/partiallytrapped（原生 volatile），
// 行为写在本单元 skill.ts 的绑定水流与 navigate 监听里。移动速度归零不采用（潮旋是拖拽不是定身），
// 减速由 skill.ts 的 MobEffects.fixedAttributes 按载体等级投影成大于零的移速倍率，与本单元的导航减速同源；
// 每趟灌水与回拉由绑定效果按 2 刻一拍驱动，不在这里逐 tick 做。
StartupEvents.registry("mob_effect", event => event.create("world_combat:whirlpool_current")
    .harmful()
    .color(0x3A78C2)
    .tag("world_combat:status/partiallytrapped")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
