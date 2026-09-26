// 盐水 / brine：把目标浇得湿透，借共享身份 world_combat:status/soaked
// （与喷水、热水同一身份，别的单元以后就能只问「湿没湿」）。盐水本身只做标记：命中即湿，
// 但不额外拖慢脚步——减速交给真正以水做控制的招式；其余交给消费方。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:brine_soaked")
    .harmful()
    .color(0x4FA8C8)
    .tag("world_combat:status/soaked")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
