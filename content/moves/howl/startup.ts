// 斗志：长嚎以「集结窗口」形式留在身上的可见状态，承载共享身份 world_combat:status/howl。
// 抬起的攻击等级由绑定这份载体的 boostWindow 拥有并随载体收回，amplifier 只作档位标记、不再记录级数。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:howl_rally")
    .beneficial()
    .color(0xE8A54B)
    .tag("world_combat:status/howl")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
