// 快手还击的畏缩载体：只借共享身份 world_combat:status/flinch，行为（门禁与打断）由本单元写。
StartupEvents.registry("mob_effect", event => event.create("world_combat:upperhand_flinch")
    .harmful()
    .color(0xE0B060)
    .tag("world_combat:status/flinch")
    .effectTick((entity: any, amplifier: number) => { }));
