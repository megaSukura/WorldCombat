// 炸蛋的滑蛋液载体：共享身份 world_combat:status/slick，自带移动速度修饰；谁踩上去打滑的行为
// 由本单元 skill.ts 的字段规则 world_combat:eggbomb_slick 写。identity_only：只借身份，减速由本效果自带。
StartupEvents.registry("mob_effect", event => event.create("world_combat:eggbomb_slick")
    .harmful()
    .color(0xF2C14E)
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:eggbomb_slick", -0.45, "add_multiplied_total")
    .tag("world_combat:status/slick")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
