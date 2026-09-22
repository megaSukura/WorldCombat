// 喷射拳的浇透载体：一个真实有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/soaked（与水系招式共用，别的单元可以只问「湿没湿」）。行为只有一处：湿透的个体移动稍慢，
// 由原生属性修饰承担，随效果到期一起消失；其余交给消费方。图标复用原版海豚的恩惠。
StartupEvents.registry("mob_effect", event => event.create("world_combat:jetpunch_drenched")
    .harmful()
    .color(0x2F86C8)
    .tag("world_combat:status/soaked")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:jetpunch_drenched", -0.06, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
