// 戏法空间的成员身份：站在歪斜空间里的活体带这个世界共有的身份 world_combat:status/trickroom。
// 真正的速度倒转由本单元 rules.ts 在 `world_combat:navigate` 上按该身份与空间参数改写；
// 消费方用 CombatStatus.has(world, actor, "trickroom") 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", event => event.create("world_combat:trickroom_shift")
    .beneficial()
    .color(0x8A6CFF)
    .tag("world_combat:status/trickroom")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
