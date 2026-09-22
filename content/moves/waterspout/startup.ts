// 喷水 / waterspout：把目标浇得湿透，借共享身份 world_combat:status/soaked
// （与泼冷水、水流尾同一身份，别的单元以后就能只问「湿没湿」）。行为只有一处：湿透的个体移动稍慢，
// 由原生属性修饰承担，随效果到期一起消失；其余交给消费方。启动脚本不引用服务端共享库，
// 标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:waterspout_soaked")
    .harmful()
    .color(0x3FA8E0)
    .tag("world_combat:status/soaked")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:waterspout_soaked", -0.15, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:waterspout_soaked", -0.15, "add_multiplied_total")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
