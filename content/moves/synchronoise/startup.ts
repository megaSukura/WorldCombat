// 同步干扰的「同频」记号：共享身份 world_combat:status/resonance。
// 效果只提供身份、时长与图标；本招的开关是属性比对（见 skill.ts），记号本身不附带数值行为（identity_only），
// 留给后续内容按身份消费。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:resonance")
    .harmful()
    .color(0xF85888)
    .tag("world_combat:status/resonance")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
