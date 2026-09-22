// 回复封锁：一个只承载共享身份 world_combat:status/healblock 的可见状态，告诉玩家与对手「回血被镇住」还剩多久。
// 回血闸门在共享的 NativeEffects.healing 上（本单元 rules.ts），任何经过共享治疗入口的回复都会被清零；
// 少数直接写生命的路径由 rules.ts 盯着 actor_changed 按回生命地板补漏。消费方按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:healblock").harmful().color(0x9B6BE8)
        .tag("world_combat:status/healblock").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
