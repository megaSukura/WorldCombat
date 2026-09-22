// 击落的贴地载体：借共享身份 world_combat:status/smackdown，行为（拔浮空、拽地、按地）写在本单元 skill.ts。
// 对宝可梦、原版生物、玩家是同一个状态效果：物品栏可见、/effect 可用。
StartupEvents.registry("mob_effect", event => event.create("world_combat:smackdown_pin")
    .harmful()
    .color(0x8A7A62)
    .tag("world_combat:status/smackdown")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟继续发出 world_combat:mob_effect_tick；行为不在这里。
    .effectTick((entity: any, amplifier: number) => { }));
