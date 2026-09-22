// 极光幕的载体：一个真实有益 MobEffect，对任何活体是同一个身份 world_combat:status/auroraveil；
// 物特两路的削减写在本单元 rules.ts 的入场伤害规则，消费方用 CombatStatus.has(world, actor, "auroraveil")
// 按身份读取，不依赖这个 id。只有友方能被极光罩住。
StartupEvents.registry("mob_effect", event => event.create("world_combat:auroraveil_screen")
    .beneficial()
    .tag("world_combat:category/screen")
    .color(0x7FE6D8)
    .tag("world_combat:status/auroraveil")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
