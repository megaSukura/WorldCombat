// 扎根的载体：一个真实有益 MobEffect，共享身份 world_combat:status/ingrain（词表里的挥发状态名）。
// 逐拍回血的行为写在本单元 skill.ts 里（读机读标记 world_combat:ingrain_mark）；消费方用
// CombatStatus.has(world, actor, "ingrain") 按身份读取，不依赖这个 id。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:ingrain")
    .beneficial()
    .color(0x6FA83A)
    .tag("world_combat:status/ingrain")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
