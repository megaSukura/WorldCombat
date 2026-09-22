// 牵手：两人身上的共享身份 world_combat:status/holdhands（消费方用 CombatStatus.has(world, actor, "holdhands")）。
// 效果只提供身份、时长与图标；拉手期间的互相疗伤由 skill.ts 的连接效果结算，效果本身不做逐 tick 行为。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:hand_in_hand").beneficial().color(0xFF9FBF)
        .tag("world_combat:status/holdhands").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
