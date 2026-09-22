// 斗志：长嚎以「集结窗口」形式留在身上的可见状态，承载共享身份 world_combat:status/howl。
// amplifier 记录这声嗥抬起的攻击等级；窗口走完或被清除时由本单元 skill.ts 从移除事件里原样收回。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:howl_rally")
    .beneficial()
    .color(0xE8A54B)
    .tag("world_combat:status/howl")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
