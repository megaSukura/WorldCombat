// 爱心印章的两个状态载体：
//   畏缩  —— 借共享身份 world_combat:status/flinch，behavior 全由本单元写（skill.ts 的门禁）。
//   疏忽  —— 本单元发明的新身份 world_combat:status/offguard；卖萌后目标进入的破绽窗口，
//            只借身份、行为由 skill.ts 的追击结算与别的单元以后自行消费。
// 两者对宝可梦、原版生物、玩家都是同一个状态效果：物品栏可见、/effect 可用。
StartupEvents.registry("mob_effect", event => event.create("world_combat:heartstamp_flinch")
    .harmful()
    .color(0xE68BB4)
    .tag("world_combat:status/flinch")
    .effectTick((entity: any, amplifier: number) => { }));

StartupEvents.registry("mob_effect", event => event.create("world_combat:heartstamp_offguard")
    .harmful()
    .color(0xFF9EC4)
    .tag("world_combat:status/offguard")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
