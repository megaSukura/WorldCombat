// 精神噪音的杂音载体：一个真实有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/healblock；「任何回复被清零」的行为写在本单元 parameters.ts 的共享治疗贡献里。
// 消费方用 CombatStatus.has(world, actor, "healblock") 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", event => event.create("world_combat:psychic_noise")
    .harmful()
    .color(0xE06AD0)
    .tag("world_combat:status/healblock")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
