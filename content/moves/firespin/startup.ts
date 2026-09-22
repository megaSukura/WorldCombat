// 火焰旋涡的灼焰载体：借共享身份 world_combat:status/partiallytrapped（原生 volatile），
// 行为写在本单元 skill.ts 的绑定火柱里。火柱贴着目标走，不用属性修饰限制移动——
// 目标是跑不脱火焰的，除非把火扑灭（湿身）或烧完时长。逐拍灼烧与点燃由绑定效果按 interval 驱动。
StartupEvents.registry("mob_effect", event => event.create("world_combat:firespin_blaze")
    .harmful()
    .color(0xE86A2A)
    .tag("world_combat:status/partiallytrapped")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
