// 爆音波的耳鸣载体：共享身份 world_combat:status/deafened。
// 效果只提供身份、时长与图标，不附带数值行为（identity_only）；留下它本身就是这招的「结果」，
// 后续内容可以按这个身份消费「听不见」。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:deafened")
    .harmful()
    .color(0x6E6E82)
    .tag("world_combat:status/deafened")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
