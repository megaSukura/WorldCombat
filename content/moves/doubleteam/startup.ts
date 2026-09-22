// 影子分身的残影状态：一个真实有益 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/doubleteam；替本体挨打由本单元 skill.ts 的 GuardEffects 规则承担，
// 消费方用 CombatStatus.has(world, actor, "doubleteam") 按身份读取，不依赖这个 id。
// 撑影期间移速小幅提升；这是「快速移动」留下的余势，也是玩家能一眼看懂的状态。
StartupEvents.registry("mob_effect", event => event.create("world_combat:doubleteam_mirror")
    .beneficial()
    .color(0x9AA8C8)
    .tag("world_combat:status/doubleteam")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:doubleteam_mirror_speed", 0.12, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
