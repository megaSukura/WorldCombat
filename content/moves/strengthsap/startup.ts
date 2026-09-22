// 吸取力量留下的虚弱：一个真实的有害 MobEffect，宝可梦、原版生物与玩家是同一个身份
// world_combat:status/strength_sapped。真正的物攻下降由 skill.ts 调用 NativeEffects.boost(atk, -n) 完成，
// 宝可梦记在原生物攻等级、其他战斗者落到攻击属性上；这个效果负责物品栏可见、AI 可读与破绽画面。
StartupEvents.registry("mob_effect", event => event.create("world_combat:strengthsap_weakened")
    .harmful()
    .color(0x8FC63F)
    .tag("world_combat:status/strength_sapped")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
