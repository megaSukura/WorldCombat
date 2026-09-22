// 庆祝的「庆祝中」载体：一个真实有益 MobEffect，对任何活体是同一个身份 world_combat:status/celebrate。
// 两种欢喜（速度 +1 或当场回复）写在本单元 skill.ts，消费方用 CombatStatus.has(world, actor, "celebrate")
// 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", event => event.create("world_combat:celebrate_spirit")
    .beneficial()
    .color(0xFFC24D)
    .tag("world_combat:status/celebrate")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
