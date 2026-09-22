// 掷锚的束缚载体：借共享身份 world_combat:status/trapped（别的单元可据此判断「被钉住、逃不掉」）。
// 行为由本单元写：状态自带减速，链的每步回拽与导航压制写在 skill.ts；identity_only 表示只借身份。
StartupEvents.registry("mob_effect", event => event.create("world_combat:anchor_chain_status")
    .harmful()
    .color(0x8C939C)
    .tag("world_combat:status/trapped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:anchor_chain_status_speed", -0.3, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
