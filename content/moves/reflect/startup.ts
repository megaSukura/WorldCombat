// 反射壁的载体：一个真实有益 MobEffect，对任何活体是同一个身份 world_combat:status/reflect；
// 物理削减与反弹写在本单元 skill.ts 的入场伤害规则，消费方用 CombatStatus.has(world, actor, "reflect")
// 按身份读取，不依赖这个 id。施法者以自身为锚把它补给队友。
StartupEvents.registry("mob_effect", event => event.create("world_combat:reflect_plates")
    .beneficial()
    .tag("world_combat:category/screen")
    .color(0x8FC7FF)
    .tag("world_combat:status/reflect")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
