// 冰锤 / icehammer：被这记裹冰重锤砸中的目标挂上的冰缓。借共享身份 world_combat:status/chilled
// （与以后别的冰系内容共用同一个身份），行为只有一处：被冰缓的个体移动稍慢，由原生属性修饰承担，
// 随效果到期一起消失；其余留给消费方。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:icehammer_chilled")
    .harmful()
    .color(0x8FD6F5)
    .tag("world_combat:status/chilled")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:icehammer_chilled", -0.15, "add_multiplied_total")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
