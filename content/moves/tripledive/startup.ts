// 三连钻：一段可见的「身上还湿着」窗口，只承载共享身份 world_combat:status/drenched。
// 水花留下的湿身不是文字：三连钻自己会读它、对已经湿透的目标加重后续钻击，别的作者以后也能按这个身份消费。
// 本单元不借任何共享默认行为，行为全部写在 skill.ts 里，所以带 identity_only。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:tripledive_drenched")
    .harmful()
    .color(0x4FA8D8)
    .tag("world_combat:status/drenched")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
