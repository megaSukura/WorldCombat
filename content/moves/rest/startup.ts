// 睡满一觉留下的「神清气爽」：短暂提升移动速度，并携带共享身份 world_combat:status/refreshed，
// 别的内容可以直接消费它。只借身份、不附带受伤/异常行为，所以不用写规则。
StartupEvents.registry("mob_effect", event => event.create("world_combat:refreshed")
    .beneficial()
    .color(0xFFE08A)
    .tag("world_combat:status/refreshed")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:refreshed_speed", 0.2, "add_multiplied_total")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
