// 黑土：耕地给草属性挂在身上的可见状态，承载共享身份 world_combat:status/plowed。
// 它只借身份；双攻提升由 skill.ts 以 boostWindow 绑在这份载体上，载体结束、被驱散或离场时一并复原。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:rototiller_plowed")
    .beneficial()
    .color(0x6B4A2B)
    .tag("world_combat:status/plowed")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
