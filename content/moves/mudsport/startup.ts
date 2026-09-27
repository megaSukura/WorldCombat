// 玩泥巴的糊泥载体：一个真实状态效果，带三个身份——world_combat:status/mudsport 是本招的机读键
// （电招削弱由 rules.ts 读它），world_combat:status/mud 是共享的「糊泥」身份，别的单元可以只问糊没糊。
// 它同时是通用泥地的移动代价：脚踩在泥里时移动速度上限降低 15%（add_multiplied_total）。
// 同一个效果只挂一个固定修饰，所以多个泥场重叠不会相乘，始终按这 15% 上限生效；离地或离开泥滩由 rules.ts 立即移除。
StartupEvents.registry("mob_effect", event => event.create("world_combat:mudsport_coat")
    .harmful()
    .color(0x6B4A2E)
    .tag("world_combat:status/mudsport")
    .tag("world_combat:status/mud")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:mudsport_bog", -0.15, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
