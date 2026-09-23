// 雪崩的「被打懵」凭据；当前配招带本招的个体积伤，其他域可由内容显式授予此载具启用积累。
// 行为（雪崩翻倍、层数放大范围与击退，随窗口自然消退）写在本单元 parameters.ts 与 skill.ts。
StartupEvents.registry("mob_effect", event => event.create("world_combat:avalanche_battered")
    .harmful()
    .color(0x88B7D6)
    .tag("world_combat:status/battered")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
