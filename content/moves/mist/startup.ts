// 白雾的载体：一个真实有益 MobEffect，对任何活体是同一个身份 world_combat:status/mist；
// 拦截能力降级由本单元 skill.ts 的共享变化规则负责，消费方用 CombatStatus.has(world, actor, "mist")
// 按身份读取，不依赖这个 id。施法者以自身为锚把它补给队友。
StartupEvents.registry("mob_effect", event => event.create("world_combat:mist_veil")
    .beneficial()
    .color(0xBFE6F0)
    .tag("world_combat:status/mist")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
