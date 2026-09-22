// 神秘守护的载体：一个真实有益 MobEffect，对任何活体是同一个身份 world_combat:status/safeguard。
// 挡下异常由本单元 skill.ts 的 CombatStatus.gate 负责；消费方用 CombatStatus.has(world, actor, "safeguard")
// 按身份读取，不依赖这个 id。施法者以自身为锚把它补给范围内的队友。
StartupEvents.registry("mob_effect", event => event.create("world_combat:safeguard_veil")
    .beneficial()
    .color(0x9FE8B0)
    .tag("world_combat:status/safeguard")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
