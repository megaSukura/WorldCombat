// 水流尾的湿身载体：一个真实有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/soaked（别的单元可以只问湿没湿）。行为只有一处：湿透的个体移动稍慢，
// 由原生属性修饰承担，随效果到期一起消失；其余交给消费方。图标复用原版海豚的恩惠。
StartupEvents.registry("mob_effect", event => event.create("world_combat:aquatail_drenched")
    .harmful()
    .color(0x3E8FD0)
    .tag("world_combat:status/soaked")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:aquatail_drenched", -0.10, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
