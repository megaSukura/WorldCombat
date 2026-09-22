// 玩水的水湿载体：一个真实状态效果，带两个身份——world_combat:status/watersport 是本招的机读键
// （火招削弱由本单元 rules.ts 读它），world_combat:status/soaked 是共享的「湿」身份，别的单元可以只问湿没湿。
StartupEvents.registry("mob_effect", event => event.create("world_combat:watersport_soaked")
    .harmful()
    .color(0x3E8FD0)
    .tag("world_combat:status/watersport")
    .tag("world_combat:status/soaked")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
