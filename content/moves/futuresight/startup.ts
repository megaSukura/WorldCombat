// 预知未来的预知印记：一个真实有害 MobEffect，对宝可梦、原版生物、玩家是同一个身份
// world_combat:status/futuresight；它只是给「已被锁定」这件事一个物品栏可见、/effect 可查的身份。
// 落下的时机与伤害由本单元 skill.ts 的 world_combat:futuresight_charge 效果持有；
// 清掉印记不会取消已经定下的预知。消费方用 CombatStatus.has(world, actor, "futuresight") 按身份读取。
StartupEvents.registry("mob_effect", event => event.create("world_combat:futuresight_seal")
    .harmful()
    .color(0x8A7BFF)
    .tag("world_combat:status/futuresight")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
