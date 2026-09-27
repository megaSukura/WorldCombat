// 森林诅咒的草属性身份：一个真实有害 MobEffect，承载共享身份 world_combat:status/forestscurse，
// 对宝可梦、原版生物、玩家是同一个东西（物品栏可见、/effect 可用、牛奶可解）。
// 真正的属性追加由通用 CombatTypes 的 types 层承担（skill.ts 命中后写入，绑定这个载体，驱散或到期时收束），
// 标记本身供别的作者按身份消费，普通生物与宝可梦共用同一个效果。
StartupEvents.registry("mob_effect", event => event.create("world_combat:forest_curse")
    .harmful()
    .color(0x5FA83C)
    .tag("world_combat:status/forestscurse")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
