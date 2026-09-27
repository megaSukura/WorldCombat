// 吸取力量留下的虚弱：一个真实的有害 MobEffect，宝可梦、原版生物与玩家是同一个身份
// world_combat:status/strength_sapped。真正的物攻下降是本单元 skill.ts 用 NativeEffects.boostWindow
// 挂在这条载体上的临时负贡献：只在本状态存续期间生效，状态到期或被清除时随载体一起收回，只撤本招自己那一份。
// 这个效果负责物品栏可见、AI 可读与破绽画面。
StartupEvents.registry("mob_effect", event => event.create("world_combat:strengthsap_weakened")
    .harmful()
    .color(0x8FC63F)
    .tag("world_combat:status/strength_sapped")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
