// 唱歌：睡意载体。只借共享身份 world_combat:status/drowsy（identity_only），行为由本单元 skill.ts 读取。
// amplifier 记录已经听进几句（0 起算），本身不带属性修饰——固定的小幅减速另用 amplifier 0 的 shared
// 迟缓承载，两者分开，累积句数不会把免眠者一路拖到零速。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:sing_drowsy")
    .harmful()
    .color(0x9B7BD8)
    .tag("world_combat:status/drowsy")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行；睡意本身只计数，不修改属性。
    .effectTick((entity: any, amplifier: number) => { }));
