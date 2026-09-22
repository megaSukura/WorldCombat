// 黑土：耕地给草属性挂在身上的可见状态，承载共享身份 world_combat:status/plowed。
// amplifier 记录这块土给这人抬了几级双攻；离场、到期或被清除时由本单元 skill.ts 从移除事件里原样收回。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:rototiller_plowed")
    .beneficial()
    .color(0x6B4A2B)
    .tag("world_combat:status/plowed")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
