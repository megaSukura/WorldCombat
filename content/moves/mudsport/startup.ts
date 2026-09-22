// 玩泥巴的糊泥载体：一个真实状态效果，带三个身份——world_combat:status/mudsport 是本招的机读键
// （电招削弱由 rules.ts 读它），world_combat:status/mud 是共享的「糊泥」身份，别的单元可以只问糊没糊。
StartupEvents.registry("mob_effect", event => event.create("world_combat:mudsport_coat")
    .harmful()
    .color(0x6B4A2E)
    .tag("world_combat:status/mudsport")
    .tag("world_combat:status/mud")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
