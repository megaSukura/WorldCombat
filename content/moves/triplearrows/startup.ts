// 三连箭的两道载体：
//   world_combat:triplearrows_guard —— 共享身份 world_combat:status/guardbroken（与破防一族同一身份），
//   行为（降防与画面）由本单元写，别的破防招可以接着消费。
//   world_combat:triplearrows_flinch —— 共享身份 world_combat:status/flinch，配合 world_combat:interrupt
//   与本单元 skill.ts 的门禁把目标压住一小段。
StartupEvents.registry("mob_effect", event => event.create("world_combat:triplearrows_guard")
    .harmful()
    .color(0x9AA86A)
    .tag("world_combat:status/guardbroken")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));

StartupEvents.registry("mob_effect", event => event.create("world_combat:triplearrows_flinch")
    .harmful()
    .color(0xB8C878)
    .tag("world_combat:status/flinch")
    .effectTick((entity: any, amplifier: number) => { }));
