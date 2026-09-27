// 折弯汤匙的失神。一个真实的 harmful MobEffect 让宝可梦、原版生物与玩家同样「被引开注意、打不准」。
// 它带共享身份 world_combat:status/beguiled，并挂上家族的伞身份 world_combat:status/aim_impaired。
// -15% 物理直接攻击的抑制不再只改原版 attack_damage 属性，而由 skill.ts 注册到共享 incoming 规则，对所有实体的物理直攻同语义生效；
// 命中等级下降则由 NativeEffects.boostWindow 绑在这份载体上，随它存续、随它复原。启动脚本不引用服务端库。
StartupEvents.registry("mob_effect", event => event.create("world_combat:kinesis_beguiled")
    .harmful()
    .color(0x8FA8E0)
    .tag("world_combat:status/beguiled")
    .tag("world_combat:status/aim_impaired")
    .effectTick((entity: any, amplifier: number) => { }));
